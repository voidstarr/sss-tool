# SSS Tool

```
usage: index.js [-h] [-f CONFIG_FILE] [-w]
                {login,assignment,status,password} ...

SSS Tool

positional arguments:
  {login,assignment,status,password}

optional arguments:
  -h, --help            show this help message and exit
  -f CONFIG_FILE, --config-file CONFIG_FILE
                        file that stores username, password, term, course, and
                        sessionid
  -w, --write-config    save configurations supplies by the command line into
                        the configuration file
```

## login
```
usage: index.js login [-h] [-u USERNAME] [-p PASSWORD] [-e SESSION] [-o SCHOOL]
                      [-t TERM] [-c COURSE]

positional arguments:
  login

optional arguments:
  -h, --help            show this help message and exit
  -u USERNAME, --username USERNAME
                        bronconame
  -p PASSWORD, --password PASSWORD
                        SSS password
  -e SESSION, --session SESSION
                        session_id
  -o SCHOOL, --school SCHOOL
                        school
  -t TERM, --term TERM  ex: 2020_fall
  -c COURSE, --course COURSE
                        ex: CS_2600
```

## assignment -- TODO
```
usage: index.js assignment [-h] [-l | -s SUBMIT]

positional arguments:
  assignment

optional arguments:
  -h, --help            show this help message and exit
  -l, --list            lists assignments that can be submitted
  -s SUBMIT, --submit SUBMIT
                        filename to upload to SSS
```

## status -- TODO
```
usage: index.js status [-h]

positional arguments:
  status

optional arguments:
  -h, --help  show this help message and exit
```

## password -- TODO
```
usage: index.js password [-h] oldPassword newPassword

positional arguments:
  password
  oldPassword
  newPassword

optional arguments:
  -h, --help   show this help message and exit
```