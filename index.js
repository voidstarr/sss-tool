#!/usr/bin/env node
'use strict';
const { ArgumentParser } = require('argparse');
const os = require('os');
const fs = require('fs');
const got = require('got');
const jsdom = require('jsdom');
const { URLSearchParams } = require('url');
const { JSDOM } = jsdom;

const BASE_URL = "https://www.dagertech.net/cgi-bin/cgiwrap/gershman/sss/index.cgi";

const pkg = require('./package.json');
const defaultConfigFile = os.homedir() + "/.sssconfig.json";

const parser = new ArgumentParser({
    description: 'SSS Tool',
    add_help: true
});

parser.add_argument('-f', '--config-file', { help: 'file that stores username, password, term, course, and sessionid', default: defaultConfigFile });
parser.add_argument('-w', '--write-config', { help: 'save configurations supplies by the command line into the configuration file', action: 'store_true' });

const subparsers = parser.add_subparsers();

const login_parser = subparsers.add_parser('login');
login_parser.add_argument('login', { action: 'store_true' });
login_parser.add_argument('-u', '--username', { help: 'bronconame' });
login_parser.add_argument('-p', '--password', { help: 'SSS password' });
login_parser.add_argument('-e', '--session', { help: 'session_id' });
login_parser.add_argument('-o', '--school', { help: 'school' });
login_parser.add_argument('-t', '--term', { help: 'ex: 2020_fall' });
login_parser.add_argument('-c', '--course', { help: 'ex: CS_2600' });


const assignment_parser = subparsers.add_parser('assignment');
assignment_parser.add_argument('assignment', { action: 'store_true' });
const assignment_group = assignment_parser.add_mutually_exclusive_group();
assignment_group.add_argument('-l', '--list', { help: 'lists assignments that can be submitted', action: 'store_true' });
assignment_group.add_argument('-s', '--submit', { help: 'filename to upload to SSS' });

const status_parser = subparsers.add_parser('status', {argument_default: true});
status_parser.add_argument('status', { action: 'store_true' });

const password_parser = subparsers.add_parser('password');
password_parser.add_argument('password', { action: 'store_true' });
password_parser.add_argument('oldPassword');
password_parser.add_argument('newPassword');

const args = parser.parse_args(); 

if(process.env.SSS_DEBUG) {
    console.log('args', args);
}

var configFile = args.config_file;
var config = {};
var configOnDisk = {};

if (fs.existsSync(configFile)) {
    configOnDisk = require(configFile);
}

if (args.session_id !== undefined) {
    config.school = args.school;
} else if (configOnDisk.session_id !== undefined && configOnDisk.session_id !== '') {
    config.school = configOnDisk.school;
} else {
    config.school = 'cal_poly_pomona';
}

if (args.course !== undefined) {
    config.course = args.course;
} else if (configOnDisk.course !== undefined && configOnDisk.course !== '') {
    config.course = configOnDisk.course;
} else {
    config.course = 'CS_2600';
}

if (args.term !== undefined) {
    config.term = args.term;
} else if (configOnDisk.term !== undefined && configOnDisk.term !== '') {
    config.term = configOnDisk.term;
} else {
    config.term = '2020_fall';
}

if(process.env.SSS_DEBUG) {
    console.log('config', config);
}

var searchParams = {
    app: 'teaching',
    goto: 'sss',
    school: config.school,
    course: config.course,
    term: config.term
};

if (args.login !== undefined) {
    login();
} else {
    hasValidSession().then(((statusPage) => {
        if(args.status !== undefined) {
            showStatus(statusPage);
        } else if(args.assignment !== undefined) {
            if (args.list) {
                listAssignments();
            } else if (args.submit !== undefined) {
                submitAssignment();
            }
        } else if (args.password !== undefined) {
            changePassword();
        }
    })).catch((err) => {
        console.log('Invalid session. You must login again.\n', err);
        process.exit(-1);
    });
}

function hasValidSession() {
    if(args.session_id !== undefined) {
        config.session_id = args.session_id;
    } else if (configOnDisk.session_id !== undefined && configOnDisk.session_id !== '') {
        config.session_id = configOnDisk.session_id;
    }
    searchParams.session_id = config.session_id;
    searchParams.ssscmd = 'status';

    return new Promise((resolve, reject) => {
        got.get(`${BASE_URL}` , {
            resolveBodyOnly: true,
            searchParams,
            https: {
                responseType: 'text',
                rejectUnauthorized: false
            }
        }).then(r => {
            const dom = new JSDOM(r);
            var statusPageLink = dom.window.document.getElementById("sss_option_status");
            var loginErrorMessage = dom.window.document.getElementById('sss_login_errmsg');

            if (statusPageLink !== null && statusPageLink.firstChild.href.split('session_id=')[1] === config.session_id) {
                resolve(dom);
            } else if (loginErrorMessage !== null && loginErrorMessage.textContent.contains('Session has expired.')) {
                reject('Session has expired.');
            } else {
                reject('dunno');
            }
        }).catch(err => {
            reject(err);
        });
    });
}

// POST `BASE_URL`app=teaching&goto=sss&school=cal_poly_pomona&course=CS_2600&term=2020_fall
//      body: authstring=username/password&ssscmd=login&app=teaching&goto=sss&school=cal_poly_pomona&course=CS_2600&term=2020_fall
//
// returns: https://www.dagertech.net/cgi-bin/cgiwrap/gershman/sss/index.cgi?app=teaching&goto=sss&school=cal_poly_pomona&course=CS_2600&term=2020_fall
// session_id from url: sss_option_status.a
// invalid user/pass: if #sss_login_errmsg contains "Invalid Username or Password"
function login() {
    if (args.username !== undefined) {
        config.username = args.username;
    } else if (configOnDisk.username !== undefined && configOnDisk.username !== '') {
        config.username = configOnDisk.username;
    } else {
        console.log('You must supply your username AND password in the progarm arguments, or a configuration file.')
        process.exit(-1);
    }

    if (args.password !== undefined) {
        config.password = args.password;
    } else if (configOnDisk.password !== undefined && configOnDisk.password !== '') {
        config.password = configOnDisk.password;
    } else {
        console.log('You must supply your username AND password in the progarm arguments, or a configuration file.');
        process.exit(-1);
    }

    var bodyParams = new URLSearchParams(searchParams);
    bodyParams.append('authstring', `${config.username}/${config.password}`);
    bodyParams.append('ssscmd', 'login');

    if(process.env.SSS_DEBUG)
        console.log('login: post body', bodyParams.toString())

    got.post(`${BASE_URL}` , {
        resolveBodyOnly: true,
        searchParams,
        body: bodyParams.toString(),
        https: {
            responseType: 'text',
            rejectUnauthorized: false
        }
    }).then(r => {
        const dom = new JSDOM(r);
        var loginErrorMessage = dom.window.document.getElementById("sss_login_errmsg");

        if(process.env.SSS_DEBUG)
            console.log('login: invalidUserPass', loginErrorMessage);

        if(loginErrorMessage !== null && loginErrorMessage.textContent !== '') {
            console.log('Invalid Username or Password');
            process.exit(-1);
        } 
        config.session_id = configOnDisk.session_id = dom.window.document.getElementById("sss_option_status").firstChild.href.split('session_id=')[1];

        fs.writeFileSync(configFile, JSON.stringify(args.writeFile ? config : configOnDisk, null, 4));
    }).catch(err => {
        console.log(err);
    });
}

// GET https://www.dagertech.net/cgi-bin/cgiwrap/gershman/sss/index.cgi?app=teaching&goto=sss&school=cal_poly_pomona&course=CS_2600&term=2020_fall&ssscmd=submit&session_id=%sessionID
//
// list of assignments available to submit: //*[@id="sss_submit_assignment_number"]
function listAssignments() {
    searchParams.ssscmd = 'submit';

    got.get(`${BASE_URL}` , {
        resolveBodyOnly: true,
        searchParams,
        https: {
            responseType: 'text',
            rejectUnauthorized: false
        }
    }).then(r => {
        const dom = new JSDOM(r);
        var assignmentList = dom.window.document.getElementById("sss_submit_assignment_number");
        console.log(assignmentList);
        // TODO
        
    }).catch(err => {
        console.log(err);
    });
}

// POST https://www.dagertech.net/cgi-bin/cgiwrap/gershman/sss/index.cgi?app=teaching&goto=sss&school=cal_poly_pomona&course=CS_2600&term=2020_fall&ssscmd=submit&session_id=%sessionID
//      body: ssscmd=submit&app=teaching&goto=sss&school=cal_poly_pomona&course=CS_2600&term=2020_fall&session_id=%session_id%&sss_submit_assignment_number=%assignment_number%&sss_submit_file=%file%
//
// returns: TODO
function submitAssignment() {

}

// POST https://www.dagertech.net/cgi-bin/cgiwrap/gershman/sss/index.cgi?app=teaching&goto=sss&school=cal_poly_pomona&course=CS_2600&term=2020_fall&ssscmd=chgpwd&session_id=%sessionID
//      body: ssscmd=dochg&app=teaching&goto=sss&school=cal_poly_pomona&course=CS_2600&term=2020_fall&session_id=%session_id%&old_password=%old_pw%&new_password=%new_pw%
//
// returns: 
function changePassword() {

}

function showStatus(statusPage) {
    var statusTable = statusPage.window.document.getElementById('sss_status_table');
    var tableColumns = statusTable.rows[0].cells;
    var table = {};
    table.scores = {};
    for (var i = 1; i < statusTable.rows[1].cells.length; i++) {
        var score = statusTable.rows[1].cells[i].textContent;
        if (score !== '')
            table.scores[tableColumns[i]] = score;
    }

    if(!Object.keys(table.scores).length) {
        console.log('No score data, yet.');
        return;
    }

    // TODO
}