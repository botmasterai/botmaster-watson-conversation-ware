import test from 'ava';
import request from 'request-promise';
import { assign } from 'lodash';
import { outgoingMessageFixtures,
         incomingUpdateFixtures } from 'botmaster-test-fixtures';
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
    t.context.botmaster.on('listening', resolve);
  });
});

test.afterEach((t) => {
  return new Promise((resolve) => {
    t.context.botmaster.server.close(resolve);
  });
});


test('just stuff', (t) => {
  t.plan(2);

  return new Promise((resolve) => {
    // just nock stuff to make sure we're catching and replying
    // to the request with the correct answer
    nock('https://some_url')
    .get('/oauth.access')
    .query(true)
    .reply(200, {});
    // custom middleware that "uses" watson stuff,
    t.context.botmaster.use({
      type: 'incoming',
      controller: async (bot, update) => {
        console.log(JSON.stringify(update, null, 2));
        // both will need to be faked using nock. An example of doing so
        // is in the Slack tests. (watson-developer-cloud would be using that)
        t.is(update.session.context, 'some expected context object');
        t.is(update.watsonUpdate, 'some Expected reply from Watson');
        // t.is()
      },
    });

    // add middleware that we are actually testing (watson-conversation-one)
    // const 

    // add necessary wrapped middleware.
    const { incoming, outgoing } = SessionWare();
    t.context.botmaster.useWrapped(incoming, outgoing);

    // make request that will start it all
    t.context.baseRequestOptions.body = incomingUpdateFixtures.textUpdate();
    request(t.context.baseRequestOptions);
  });
});
