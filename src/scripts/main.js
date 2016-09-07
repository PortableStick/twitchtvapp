import $ from 'jquery';
import handlebars from 'handlebars';
import Rx from 'rxjs/Rx';

const existingUserTemplate = handlebars.compile($('#existing-user-template').html());
const $userList = $('#user-list');

function getTwitchData(user) {
    return Rx.Observable.fromPromise($.getJSON(`http://localhost:9000/twitch/${user}`).promise());
}

$(document).ready(() => {
    if(!localStorage.getItem('firstRun')) {
        const startingNames = ["ESL_SC2", "OgamingSC2", "cretetion", "freecodecamp", "storbeck", "habathcx", "RobotCaleb", "noobs2ninjas", "barflkjasfd"];
        localStorage.setItem('users', JSON.stringify(startingNames));
        localStorage.setItem('firstRun', 'true');
    }

    const userNames = Rx.Observable.from(JSON.parse(localStorage.getItem('users')));

    let rxusernames = userNames.flatMap(getTwitchData);
    console.log(rxusernames);
    rxusernames.subscribe(data => {
        $userList.append(existingUserTemplate(data));
    });

});