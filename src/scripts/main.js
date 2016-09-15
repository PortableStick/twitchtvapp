import $ from 'jquery';
import handlebars from 'handlebars';
import { Observable, ReplaySubject } from 'rxjs/Rx';

const existingUserTemplate = handlebars.compile($('#existing-user-template').html()),
        $userList = $('#user-list'),
        gettingFilterInput = Observable.fromEvent($('#filter-input'), 'keyup')
                        .map(e => e.target.value)
                        .startWith(''),
        gettingButtonInput = Observable.fromEvent($('.sort'), 'click')
                        .map(e => $(e.target).data('value'))
                        .startWith('all'),
        storedUsers = new ReplaySubject();

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