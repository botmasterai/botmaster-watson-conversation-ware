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
    params.watson.message(messageForWatson,
      (err, watsonUpdate) => {
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
 */

const WatsonConversationWare = (options) => {
  if (!options || !options.settings || !options.workspaceId) {
    throw new Error('In order to create a watson conversation middleware, ' +
    'you need to pass in options that contain settings and workspaceId ');
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
    });
  };

  return {
    type: 'incoming',
    name: 'watson-conversation-middleware',
    controller: watsonConversationWareController,
  };
};

module.exports = WatsonConversationWare;
