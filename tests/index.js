import test from 'ava';
import request from 'request-promise';
import { incomingUpdateFixtures } from 'botmaster-test-fixtures';
import Botmaster from 'botmaster';
import { MockBot } from 'botmaster/tests';
import SessionWare from 'botmaster-session-ware';
import nock from 'nock';

import WatsonConversationWare from '../lib';

test.beforeEach((t) => {
  return new Promise((resolve) => {
    t.context.botmaster = new Botmaster();
    t.context.bot = new MockBot({
      requiresWebhook: true,
      webhookEndpoint: 'webhook',
      type: 'express',
    });
    t.context.botmaster.addBot(t.context.bot);
    t.context.baseRequestOptions = {
      method: 'POST',
      uri: 'http://localhost:3000/express/webhook',
      body: {},
      json: true,
      resolveWithFullResponse: true,
    };
    t.context.watsonConversationWareOptions = {
      settings: {
        username: 'some_username',
        password: 'some_password',
        version: 'v1', // could be another one
        version_date: '2017-02-03', // could be another one
      },
      workspaceId: 'someId',
    };
    t.context.botmaster.on('listening', resolve);
  });
});

test.afterEach((t) => {
  return new Promise((resolve) => {
    t.context.botmaster.server.close(resolve);
  });
});

const errorMacro = (t, options) => {
  t.plan(1);

  try {
    WatsonConversationWare(options);
  } catch (err) {
    t.is(err.message, 'In order to create a watson conversation middleware, ' +
    'you need to pass in options that contain settings and workspaceId keys');
  }
};

test('Throws error if trying to instantiate without options', errorMacro);
test('Throws error if options.settings is falsy', errorMacro, {
  worspaceId: 'something',
});
test('Throws error if options.workspaceId is falsy', errorMacro, {
  settings: {},
});

test('Emits error if trying to use WatsontConversationWare without SessionWare', (t) => {
  t.plan(1);

  return new Promise((resolve) => {
    // add middleware that we are actually testing (watson-conversation-one)
    const watsonConversationWare = WatsonConversationWare(
      t.context.watsonConversationWareOptions);
    t.context.botmaster.use(watsonConversationWare);

    // catching error that is emitted because SessionWare isn't used
    t.context.botmaster.on('error', (bot, err) => {
      t.is(err.message, '"Watson conversation ware needs to be used with ' +
      'SessionWare.". This is most probably on your end.');
      resolve();
    });

    // make request that will start it all
    t.context.baseRequestOptions.body = incomingUpdateFixtures.textUpdate();
    request(t.context.baseRequestOptions);
  });
});

test('When receiving update that contains no text, conversation middleware should be bypassed', (t) => {
  t.plan(3);

  return new Promise((resolve) => {
    // add middleware that we are actually testing (watson-conversation-one)
    const watsonConversationWare = WatsonConversationWare(
      t.context.watsonConversationWareOptions);
    t.context.botmaster.use(watsonConversationWare);

    // custom middleware that "uses" watson stuff,
    t.context.botmaster.use({
      type: 'incoming',
      controller: async (bot, update) => {
        // both will need to be faked using nock. An example of doing so
        // is in the Slack tests. (watson-developer-cloud would be using that)
        t.is(update.session.watsonContext, undefined, 'watsonContext shoul dhave been falsy');
        t.is(update.watsonUpdate, undefined, 'watsonUpdate should have been falsy');
        t.is(update.watsonConversation, undefined, 'watsonConversation should have been undefined');
        resolve();
      },
    });

    // add necessary wrapped middleware.
    const { incoming, outgoing } = SessionWare();
    t.context.botmaster.useWrapped(incoming, outgoing);

    // make request that will start it all
    t.context.baseRequestOptions.body = incomingUpdateFixtures.audioUpdate();
    request(t.context.baseRequestOptions);
  });
});

test('Error that occurs in watson-developer-cloud is emitted', (t) => {
  t.plan(1);

  return new Promise((resolve) => {
    // add middleware that we are actually testing (watson-conversation-one)
    t.context.watsonConversationWareOptions.workspaceId = 'somethingElse';
    const watsonConversationWare = WatsonConversationWare(
      t.context.watsonConversationWareOptions);
    t.context.botmaster.use(watsonConversationWare);

    // catching error coming from watson-developer-cloud
    t.context.botmaster.on('error', (bot, err) => {
      t.is(err.message, '"Not Authorized". This is most probably on your end.');
      resolve();
    });

    // add necessary wrapped middleware.
    const { incoming, outgoing } = SessionWare();
    t.context.botmaster.useWrapped(incoming, outgoing);

    // make request that will start it all
    t.context.baseRequestOptions.body = incomingUpdateFixtures.textUpdate();
    request(t.context.baseRequestOptions);
  });
});

test('Works as expected when settings are correctly setup', (t) => {
  t.plan(3);

  return new Promise((resolve) => {
    // just nock stuff to make sure we're catching and replying
    // to the request with the correct answer
    const watsonUpdate = {
      intents: [],
      entities: [],
      context: {
        somethingAwesome: 'sure',
      },
    };
    nock('https://gateway.watsonplatform.net/conversation/api')
    .post(`/v1/workspaces/${t.context.watsonConversationWareOptions.workspaceId}/message`)
    .query({
      version: '2017-02-03',
    })
    .reply(200, watsonUpdate);

    // add middleware that we are actually testing (watson-conversation-one)
    const watsonConversationWare = WatsonConversationWare(
      t.context.watsonConversationWareOptions);
    t.context.botmaster.use(watsonConversationWare);

    // custom middleware that "uses" watson stuff,
    t.context.botmaster.use({
      type: 'incoming',
      controller: async (bot, update) => {
        // both will need to be faked using nock. An example of doing so
        // is in the Slack tests. (watson-developer-cloud would be using that)
        t.deepEqual(update.session.watsonContext, watsonUpdate.context);
        t.deepEqual(update.watsonUpdate, watsonUpdate);
        t.not(update.watsonConversation, undefined);
        resolve();
      },
    });

    // add necessary wrapped middleware.
    const { incoming, outgoing } = SessionWare();
    t.context.botmaster.useWrapped(incoming, outgoing);

    // make request that will start it all
    t.context.baseRequestOptions.body = incomingUpdateFixtures.textUpdate();
    request(t.context.baseRequestOptions);
  });
});
