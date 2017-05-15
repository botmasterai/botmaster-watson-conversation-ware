## Botmaster Watson Conversation Ware

[![Build Status](https://travis-ci.org/botmasterai/botmaster-watson-conversation-ware.svg?branch=master)](https://travis-ci.org/botmasterai/botmaster-watson-conversation-ware)
[![Coverage Status](https://coveralls.io/repos/github/botmasterai/botmaster-watson-conversation-ware/badge.svg?branch=master)](https://coveralls.io/github/botmasterai/botmaster-watson-conversation-ware?branch=master)
[![npm-version](https://img.shields.io/npm/v/botmaster-watson-conversation-ware.svg)](https://www.npmjs.com/package/botmaster-watson-conversation-ware)
[![license](https://img.shields.io/github/license/mashape/apistatus.svg?maxAge=2592000)](LICENSE)

This incoming middleware will make the following available in the middleware
being called after it:

1.  `update.watsonUpdate`: the response Watson Conversation came with based on the
    text the bot received
2.  `update.session.watsonContext`: this is simply the watson context, which is
    also available at `update.watsonUpdate.context`. However, here, it is leveraging sessionWare and will be persisted that way. For normal use, you shouldn't worry with this.
3.  `update.watsonConversation`: Simply exposing the watson conversation object
    that has been used to get the response from watson. It can be used . This is the
    `conversation` object as seen here: <https://www.ibm.com/watson/developercloud/conversation/api/v1/?node#apiexplorer>.
    You'll only want to use this if you wish to make calls to, say, another
    workspace, or want to retrieve something else than simply the response from
    Watson (e.g. list of intents etc...). Powerful bots will probably make use of
    this in order to continually train watson for example.

## Install

    yarn add botmaster-watson-conversation-ware

or with npm

    npm install --save botmaster-watson-conversation-ware

## Note

This middleware can only be used in conjunction with botmaster-session-ware:
<https://github.com/botmasterai/botmaster-session-ware>. As the context from
botmaster needs to be persisted across different user messages.
See how sessionWare is added at the end of the example using `useWrapped`.

# API

## WatsonConversationWare

Using this will create a botmaster 3 valid incoming middleware object
that can be added by simply doing: `botmaster.use` (See example below)

**Parameters**

-   `settings` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** $0.settings just a valid watsonConversationSettings
    object that can be passed to watson-developer-cloud
-   `workspaceId` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** $0.workspaceId The workspace Id you want to
    connect to
-   `options`  

**Examples**

```javascript
const Botmaster = require('botmaster');
// Using this socket.io bot class for the sake of the example
const SocketioBot = require('botmaster-socket.io');
// might want to use this in conjunction with your own store in production
// as SessionWare uses the non-production ready MemoryStore by default
const SessionWare = require('botmaster-session-ware');
const WatsonConversationWare = require('botmaster-watson-conversation-ware');

const botmaster = new Botmaster();
botmaster.addBot(new SocketioBot({
  id: 'botId',
  server: botmaster.server,
}));

const watsonConversationWareOptions = {
  settings: {
    username: <username_as_provided_by_bluemix>,
    password: <password_as_provided_by_bluemix>,
    version: 'v1', // as of this writing (01 Apr 2017), only v1 is available
    version_date: '2017-02-03', // latest version-date as of this writing
  },
  workspaceId: <the_workspace_id_to_communicate_with> // As provided by Watson Conversation
}

// declaring middleware
const watsonConversationWare = WatsonConversationWare(watsonConversationWareOptions);
botmaster.use(watsonConversationWare);

botmaster.use({
  type: 'incoming',
  name: 'my-awesome-middleware',
  controller: (bot, update) => {
    console.log(update.watsonUpdate);
    console.log(update.session.watsonContext);
    console.log(update.watsonConversation);

    // watsonUpdate.output.text is an array as watson can reply with a few
    // messages one after another
    return bot.sendTextCascadeTo(update.watsonUpdate.output.text, update.sender.id);
  }
})

// This will make our context persist throughout different messages from the
// same user
const sessionWare = new SessionWare();
botmaster.useWrapped(sessionWare.incoming, sessionWare.outgoing);
```

Returns **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** valid botmaster 3.0 incoming middleware object
