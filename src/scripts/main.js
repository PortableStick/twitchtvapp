import $ from 'jquery';
import handlebars from 'handlebars';
import { Observable, ReplaySubject } from 'rxjs/Rx';
import toastr from 'toastr';
window.$ = window.jQuery = $;
require('bootstrap/js/modal');
$.noConflict(true);

const existingUserTemplate = handlebars.compile($('#existing-user-template').html()),
        userModalTemplate = handlebars.compile($('#user-modal-template').html()),
        userResultTemplate = handlebars.compile($('#user-result-template').html()),
        $userList = $('#user-list'),
        $userModal = $('#user-modal'),
        $buttonInput = $('.sort'),
        $dataList = $('#users'),
        $searchInput = $('#search-input'),
        $filterInput = $('#filter-input'),
        gettingFilterInput = Observable.fromEvent($filterInput, 'keyup')
                        .map(e => e.target.value)
                        .startWith(''),
        gettingButtonInput = Observable.fromEvent($buttonInput, 'click')
                        .do(e => {
                            $buttonInput.removeClass('active');
                            $(e.target).addClass('active');
                        })
                        .map(e => $(e.target).data('value'))
                        .startWith('all'),
        gettingSearchInput = Observable.fromEvent($searchInput, 'keyup')
                        .do(event => {
                            if(event.target.value.length === 0) {
                                $dataList.html('');
                            }
                        })
                        .debounceTime(500)
                        .filter(event => (event.which === 8 || event.which >= 48 && event.which <= 90))
                        .filter(event => event.target.value.length > 2)
                        .distinctUntilChanged()
                        .map(e => e.target.value),
        storedUsers = new ReplaySubject();

Observable.fromEvent(document, 'DOMContentLoaded')
    .flatMap(() => Observable.fromEvent($('#user-list'), 'click'))
    .map(event => $(event.target).closest('.twitch-user').data('store'))
    .filter(data => data !== undefined)
    .subscribe(data => {
        $userModal.append(userModalTemplate(data));
        $userModal.modal('show');
    }, handleError);

Observable.fromEvent($('.add'), 'click')
    .do(event => {
        event.preventDefault();
    })
    .subscribe(e => {
        if($searchInput.hasClass('activated')) {
            $searchInput.removeClass('activated');
            $filterInput.focus();
            $dataList.hide();
        } else {
            $searchInput.addClass('activated');
            $searchInput.focus();
            if($searchInput.val().length > 0) {
                $dataList.show();
            }
        }
    })

Observable.fromEvent($userModal, 'hidden.bs.modal')
    .subscribe(e => {
        $userModal.html('');
    }, handleError);

Observable.fromEvent($dataList, 'click')
    .map(event => $(event.target).closest('.result-name').html())
    .filter(name => name !== "undefined" && name !== null && name.length > 0)
    .filter(user => {
        let currentUsers = JSON.parse(localStorage.getItem('users'));
        if(currentUsers.findOne(user) === -1) {
            console.log(currentUsers.findOne(user));
            currentUsers.push(user);
            localStorage.setItem('users', JSON.stringify(currentUsers));
            toastr.success("User added!");
            $dataList.hide();
            $searchInput.val('');
            return true;
        } else {
            toastr.warning("User already on list");
            return false;
        }
    })
    .flatMap(user => Observable.ajax({
        url:`http://localhost:9000/twitch/${user}`,
        responseType: 'json'}))
    .map(response => response.response)
    .subscribe(storedUsers, handleError);

Observable.fromEvent($searchInput, 'focus')
    .subscribe(event => {
        if(event.target.value.length > 0) {
            $dataList.show();
        }
    }, handleError);

gettingSearchInput
    .do(e => {
        $dataList.html('');
    })
    .flatMap(search => Observable.ajax(`http://localhost:9000/twitch/search/${search}`))
    .map(response => response.response)
    .flatMap(user => user)
    .subscribe(result => {
        $dataList.append(userResultTemplate(result));
        $dataList.show();
    }, handleError)

const getUsers = Observable.create(observer => {
    if(!localStorage.getItem('hasBeenRun')) {
        const startingNames = ["dedgeomatic", "freecodecamp", "storbeck", "terakilobyte", "habathcx","RobotCaleb","thomasballinger","noobs2ninjas","beohoff","cretetion","sheevergaming","TR7K","OgamingSC2","ESL_SC2"];
        localStorage.setItem('users', JSON.stringify(startingNames));
        localStorage.setItem('hasBeenRun', 'true');
        observer.next(startingNames);
    } else {
        observer.next(JSON.parse(localStorage.getItem('users')));
    }
}).flatMap(user => user)
    .flatMap(user => Observable.ajax({
        url:`http://localhost:9000/twitch/${user}`,
        responseType: 'json'}))
    .map(response => response.response)
    .filter(user => user.url !== null)
    .subscribe(storedUsers, handleError);

gettingFilterInput
    .combineLatest(gettingButtonInput, (filter, button) => ({filter, button}))
    .do(() => {
        $userList.html('');
    })
    .flatMap(input => storedUsers.filter(user => {
        if(input.button !== 'all') {
            return user.display_name.toLowerCase().includes(input.filter.toLowerCase()) && user.isStreaming === input.button;
        } else {
            return user.display_name.toLowerCase().includes(input.filter.toLowerCase());
        }
    }))
    .subscribe(data => {
        $userList.append(existingUserTemplate(data))
    }, handleError);

Observable.fromEvent($userModal, 'click')
    .filter(event => $(event.target).hasClass('delete-button'))
    .map(event => $(event.target).data('name'))
    .subscribe(name => {
        const currentUsers = JSON.parse(localStorage.getItem('users')),
                idx = currentUsers.findOne(name);
                //TODO Error handling
                $userModal.modal('hide');
                toastr.error('User deleted');
                currentUsers.splice(idx, 1);
                localStorage.setItem('users', JSON.stringify(currentUsers));
                // $userList.html('');
                const userToGo = $userList.find(`#${name}`);
                userToGo.remove();
    }, handleError);

function handleError(error) {
    console.error(error);
}

handlebars.registerHelper('jsonify', object => JSON.stringify(object));

Array.prototype.findOne = function (search){
    let idx;
    for(let i = 0; i < this.length; i++) {
        if(this[i].toLowerCase() === search.toLowerCase()) {
            return i;
        }
    }
    return -1;
}