# About

This application is a prototype for a Voicemail and Voicemail Main replacement using ARI and Node.js.

# Installation

## Node.js

This application requires Node.js 0.10.X.

## Install voicemail application

```bash
$git clone https://github.com/asterisk/node-voicemail-js.git
$npm install
```

## Install Postgres database driver

```bash
$npm install pg
```

## Create your database and configure it

After creating and configuring a database, modify connectionString in config.json to point to your database. For example:

```
postgres://user:password@localhost/voicemail
```

## Create test data

Run the following to create all tables, indexes, and a mailbox and context for testing purposes:

```bash
$node createdata.js
```

## Asterisk configuration

Modify ariConnection in config.json to point to your Asterisk instance.

Add the following to your dialplan:

```
exten => 8888,1,NoOp()
        same => n,Stasis(voicemail,domain.com,1000)
        same => n,Hangup()
exten => 9999,1,NoOp()
        same => n,Stasis(voicemail-main,domain.com,1000)
        same => n,Hangup()
```

# Voicemail application

Start the application:

```bash
$node app.js
```

## Leave a message

Dial 8888

### Menu

- Press 1 to record a message
- Press # to end the current message
- Press 2 to confirm the current message
- Press 7 to cancel the current message

## Listen to messages

Dial 9999

### Menu

- Press 6 to play the next message
- Press 4 to play the previous message
- Press 5 to repeat the message
- Press 1 to play the first message
- Press 7 to delete the message
- Press 2 followed by the folder id and # to change folders
- Press 9 followed by the folder id and # to save the message to that folder

### Folders

- INBOX - 0
- Old - 1
- Work - 2
- Family - 3
- Friends - 4
