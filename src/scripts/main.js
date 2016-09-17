import $ from 'jquery';
import handlebars from 'handlebars';
import { Observable, ReplaySubject } from 'rxjs/Rx';
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
        gettingFilterInput = Observable.fromEvent($('#filter-input'), 'keyup')
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
                        .do(e => {
                            if(e.target.value.length === 0) {
                                $dataList.html('');
                            } else {
                                $dataList.show();
                            }
                        })
                        .debounceTime(500)
                        .filter(e => e.which >= 48 && e.which <= 90)
                        .filter(e => e.target.value.length > 2)
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
    });

Observable.fromEvent($('.add'), 'click')
    .do(e => {
        e.preventDefault();
    })
    .subscribe(e => {
        if($searchInput.hasClass('activated')) {
            $searchInput.removeClass('activated');
        } else {
            $searchInput.addClass('activated');
        }
    })

Observable.fromEvent($userModal, 'hidden.bs.modal')
    .subscribe(e => {
        $userModal.html('');
    });

Observable.fromEvent($dataList, 'click')
    .map(event => $(event.target).closest('.result-name').html())
    .do(user => {
        e.stopPropagation();
        let currentUsers = JSON.parse(localStorage.getItem('users'));
        currentUsers.push(user);
        localStorage.setItem('users', JSON.stringify(currentUsers));

        $dataList.hide();
    })
    .flatMap(user => Observable.ajax({
        url:`http://localhost:9000/twitch/${user}`,
        responseType: 'json'}))
    .map(response => response.response)
    .subscribe(storedUsers);

Observable.fromEvent($searchInput, 'focus')
    .subscribe(event => {
        if(event.target.value.length > 0) {
            $dataList.show();
        }
    });

gettingSearchInput
    .flatMap(search => Observable.ajax(`http://localhost:9000/twitch/search/${search}`))
    .map(response => response.response)
    .flatMap(user => user)
    .subscribe(result => {
        $dataList.append(userResultTemplate(result));
    })

const getUsers = Observable.create(observer => {
    if(!localStorage.getItem('hasBeenRun')) {
        const startingNames = ["ESL_SC2", "OgamingSC2", "cretetion", "freecodecamp", "storbeck", "habathcx", "RobotCaleb", "noobs2ninjas"];
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
    .subscribe(storedUsers);

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
    });


handlebars.registerHelper('jsonify', object => JSON.stringify(object));