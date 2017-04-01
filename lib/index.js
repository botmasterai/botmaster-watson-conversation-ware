'use strict';

const debug = require('debug')('botmaster:watson-conversation-middleware');
const watsonDeveloperCloud = require('watson-developer-cloud');

const sendMessageToWatson = (params) => {
  const messageForWatson = {
    context: params.context,
    workspace_id: params.workspaceId,
    input: {
      text: params.text,
    },
  };
  return new Promise((resolve, reject) => {
    params.watson.message(messageForWatson, (err, watsonUpdate) => {
      if (err) {
        return reject(err);
      }
      return resolve(watsonUpdate);
    });
  });
};

/**
 * Using this will create a botmaster 3 valid incoming middleware object
 * that can be added by simply doing: `botmaster.use` (See example below)
 * @param {object} settings $0.settings just a valid watsonConversationSettings
 * object that can be passed to watson-developer-cloud
 * @param {string} workspaceId $0.workspaceId The workspace Id you want to
 * connect to
 *
 * @returns {object} valid botmaster 3.0 incoming middleware object
 *
 * @example

const Botmaster = require('botmaster');
const SomeBotClass = require('botmaster-socket.io'); // for the sake of the example
// might want to use this in conjunction with your own store in production
// as SessionWare uses the non-production ready MemoryStore by default
const SessionWare require('botmaster-session-ware');
const WatsonConversationWare require('botmaster-watson-conversation-ware);

const botmaster = new Botmaster();
botmaster.addBot(new SomeBotClass({
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
    console.log(update.watson);

    // watsonUpdate.output.text is an array as watson can reply with a few
    // messages one after another
    return bot.sendTextCascadeTo(update.watsonUpdate.output.text, update,sender,id);
  }
})

// This will make our context persist throughout different messages from the
// same user
const { incomingSessionWare, outgoingSessionWare } = SessionWare();
t.context.botmaster.useWrapped(incomingSessionWare, outgoingSessionWare);
 */

const WatsonConversationWare = (options) => {
  if (!options || !options.settings || !options.workspaceId) {
    throw new Error('In order to create a watson conversation middleware, ' +
    'you need to pass in options that contain settings and workspaceId keys');
  }
  const watson = watsonDeveloperCloud.conversation(options.settings);

  const watsonConversationWareController = (bot, update) => {
    if (!update.session) {
      return Promise.reject(new Error('Watson conversation ware needs ' +
      'to be used with SessionWare.'));
    }
    if (!update.message || !update.message.text) {
      debug('Got an update with no text, not sending it to Watson');
      return Promise.resolve();
    }

    const context = update.session.watsonContext;
    const userText = update.message.text;

    return sendMessageToWatson({
      context,
      userText,
      watson,
      workspaceId: options.workspaceId,
    })

    .then((watsonUpdate) => {
      update.session.watsonContext = watsonUpdate.context;
      update.watsonUpdate = watsonUpdate;
      // also expose the watson-develop-cloud conversation object created
      // under the hood as user might want to use it to do other stuff
      update.watsonConversation = watson;
    });
  };

  return {
    type: 'incoming',
    name: 'watson-conversation-middleware',
    controller: watsonConversationWareController,
  };
};

module.exports = WatsonConversationWare;
