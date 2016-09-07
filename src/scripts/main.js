import $ from 'jquery';
import handlebars from 'handlebars';

const existingUserTemplate = handlebars.compile($('#existing-user-template').html()),
    notExistingUserTemplate = handlebars.compile($('#not-existing-user-template').html());
const $userList = $('#user-list');

function getTwitchData(user) {
    return $.getJSON(`http://localhost:9000/twitch/${user}`);
}

$(document).ready(() => {
    if(!localStorage.getItem('firstRun')) {
        const startingNames = ["ESL_SC2", "OgamingSC2", "cretetion", "freecodecamp", "storbeck", "habathcx", "RobotCaleb", "noobs2ninjas"];
        localStorage.setItem('users', JSON.stringify(startingNames));
        localStorage.setItem('firstRun', 'true');
    }

    const userNames = JSON.parse(localStorage.getItem('users'));
        userNames.forEach(user => {
            getTwitchData(user).then(data => {
            if(data.url) {
                $userList.append(existingUserTemplate(data));
            } else {
                $userList.append(notExistingUserTemplate(data));
            }
        }).catch(error => {
            console.error(error);
        });
    });
});