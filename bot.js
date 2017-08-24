//
// This is main file containing code implementing the Express server and functionality for the Express echo bot.
//
'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const path = require('path');
var messengerButton = "<html><head><title>Facebook Messenger Bot</title></head><body><h1>Facebook Messenger Bot</h1>This is a bot based on Messenger Platform QuickStart. For more details, see their <a href=\"https://developers.facebook.com/docs/messenger-platform/guides/quick-start\">docs</a>.<script src=\"https://button.glitch.me/button.js\" data-style=\"glitch\"></script><div class=\"glitchButton\" style=\"position:fixed;top:20px;right:20px;\"></div></body></html>";

// The rest of the code implements the routes for our Express server.
let app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

// Webhook validation
app.get('/webhook', function(req, res) {
    if (req.query['hub.mode'] === 'subscribe' &&
        req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
        console.log("Validating webhook");
        res.status(200).send(req.query['hub.challenge']);
    } else {
        console.error("Failed validation. Make sure the validation tokens match.");
        res.sendStatus(403);
    }
});

// Display the web page
app.get('/', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(messengerButton);
    res.end();
});

// Message processing
app.post('/webhook', function (req, res) {
    console.log(req.body);
    var data = req.body;

    // Make sure this is a page subscription
    if (data.object === 'page') {

        // Iterate over each entry - there may be multiple if batched
        data.entry.forEach(function(entry) {
            var pageID = entry.id;
            var timeOfEvent = entry.time;

            // Iterate over each messaging event
            entry.messaging.forEach(function(event) {
                if (event.message) {
                    receivedMessage(event);
                } else if (event.postback) {
                    receivedPostback(event);
                } else {
                    console.log("Webhook received unknown event: ", event);
                }
            });
        });

        // Assume all went well.
        //
        // You must send back a 200, within 20 seconds, to let us know
        // you've successfully received the callback. Otherwise, the request
        // will time out and we will keep trying to resend.
        res.sendStatus(200);
    }
});

// Incoming events handling
function receivedMessage(event) {
    var senderID = event.sender.id;
    var recipientId = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;

    console.log("Received message for user %d and page %d at %d with message:",
    senderID, recipientId, timeOfMessage);
    console.log(JSON.stringify(message));

    var messageId = message.mid;

    var messageText = message.text;
    var messageAttachments = message.attachments;

    if (messageText) {
        // If we receive a text message, check to see if it matches a keyword
        // and send back the template example. Otherwise, just echo the text we received.
        switch (messageText.toLowerCase()) {
            case 'plan':
                sendSelectPlanMessage(senderID);
                break;
            case 'start':
                sendInitialQuestion(senderID);
            default:
                sendTextMessage(senderID, messageText);
        }
    } else if (messageAttachments) {
        sendTextMessage(senderID, "Message with attachment received");
    }
}

function receivedPostback(event) {
    var senderID = event.sender.id;
    var recipientId = event.recipient.id;
    var timeOfPostback = event.timestamp;

    // The 'payload' param is a developer-defined field which is set in a postback
    // button for Structured Messages.
    var payload = event.postback.payload;

    console.log("Received postback for user %d and page %d with payload '%s' " +
    "at %d", senderID, recipientId, payload, timeOfPostback);

    switch (payload) {
        case 'GET_STARTED_PAYLOAD':
            sendInitialQuestion(senderID);
            break;
        case 'CUSTOMER_NO_PAYLOAD':
            var text = "Would you like to save time on Grocery shopping?";
            var buttons = [
                {
                    "title":"Definitely",
                    "payload":"SAVE_TIME_DEFINITELY_PAYLOAD"
                },
                {
                    "title":"Not sure",
                    "payload":"SAVE_TIME_NOT_SURE_PAYLOAD"
                }]
            sendButtonTemplate(senderID, text, buttons);
            break;
        case 'CUSTOMER_YES_PAYLOAD':
            var text = "You'll need to log in to your HelloFresh's account so I can further help you";
            var buttons = [
                {
                    "title":"LOGIN",
                    "payload":"LOGIN_SELECT_PAYLOAD"
                },]
            sendButtonTemplate(senderID, text, buttons);
            break;
        // case 'LOGIN_SELECT_PAYLOAD':

        //     break;

        case 'SAVE_TIME_DEFINITELY_PAYLOAD':
            var text = "Do you often cook the same meals and feel stressed out about finding new recipes? ";
            var buttons = [
                {
                    "title":"Yes exactly",
                    "payload":"STRESS_YES_PAYLOAD"
                },
                {
                    "title":"Not sure",
                    "payload":"STRESS_NO_PAYLOAD"
                }]
            sendButtonTemplate(senderID, text, buttons);
            break;
        case 'STRESS_YES_PAYLOAD':
            var text = "What about improving your cooking skills and discovering new ingredients?";
            var buttons = [
                {
                    "title":"That's interesting",
                    "payload":"COOKING_SKILLS_INTERESTING_PAYLOAD"
                },
                {
                    "title":"Not sure",
                    "payload":"COOKING_SKILLS_NOT_SURE_PAYLOAD"
                }]
            sendButtonTemplate(senderID, text, buttons);
            break;
        case 'COOKING_SKILLS_INTERESTING_PAYLOAD':
            var text = "How many people do you normally cook for?";
            var buttons = [
                {
                    "title":"2",
                    "payload":"2_PEOPLE_PAYLOAD"
                },
                {
                    "title":"3",
                    "payload":"3_PEOPLE_PAYLOAD"
                },
                {
                    "title":"4",
                    "payload":"4_PEOPLE_PAYLOAD"
                },]
            sendButtonTemplate(senderID, text, buttons);
            break;

        default:
            // When a postback is called, we'll send a message back to the sender to
            // let them know it was successful

            if (payload.indexOf("PEOPLE_PAYLOAD") !== -1) {
                var text = "How often per week would you like your dinner planning to be taking care of?";
                var buttons = [
                    {
                        "title":"2",
                        "payload":"2_MEALS_PAYLOAD"
                    },
                    {
                        "title":"3",
                        "payload":"3_MEALS_PAYLOAD"
                    },
                    {
                        "title":"4",
                        "payload":"4_MEALS_PAYLOAD"
                    },]
                sendButtonTemplate(senderID, text, buttons);
            }

            else if (payload.indexOf("MEALS_PAYLOAD") !== -1) {
                var text = "Great! We might have something for you:-) Check out our this plan";
                var buttons = [
                    {
                        "title":"CLASSIC PLAN",
                        "payload":"CLASSIC_PLAN_PAYLOAD"
                    },
                    {
                        "title":"VEGGIE PLAN",
                        "payload":"VEGGIE_PLAN_PAYLOAD"
                    },
                    {
                        "title":"FAMILY PLAN",
                        "payload":"FAMILY_PLAN_PAYLOAD"
                    },]
                sendButtonTemplate(senderID, text, buttons);
            }
            else {
                sendTextMessage(senderID, "Postback called");
            }
            break;
    }
}

function sendInitialQuestion(recipientId) {
    var text = "Are you already a Customer?";
    var buttons = [
        {
            "title":"YES",
            "payload":"CUSTOMER_YES_PAYLOAD"
        },
        {
            "title":"NO",
            "payload":"CUSTOMER_NO_PAYLOAD"
        }]
    sendButtonTemplate(recipientId, text, buttons);
}

function sendButtonTemplate(recipientId, text, buttons) {
    buttons.map(element => {
        element["type"] = "postback";
        return element;
    });
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    "text": text,
                    "buttons": buttons
                }
            }
        }
    };

    callSendAPI(messageData);
}


function sendTextMessage(recipientId, messageText) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: messageText
        }
    };

    callSendAPI(messageData);
}

function sendSelectPlanMessage(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [{
                        title: "Classic Plan",
                        subtitle: "Our widest variety of meat, fish, and seasonal produce for those craving a bit more variety.",
                        item_url: "https://www.hellofresh.com/checkout/finish/address/",
                        image_url: "https://cdn.hellofresh.com/us/cms/bags/img/2-person-c-3-desktop-shop2x_AB.jpg",
                        buttons: [{
                            type: "web_url",
                            url: "https://www.hellofresh.com/checkout/finish/address/",
                            title: "Select this Plan"
                        }],
                    }, {
                        title: "Veggie Plan",
                        subtitle: "Vegetarian recipes with plant-based proteins, grains, and seasonal produce.",
                        item_url: "https://www.hellofresh.com/checkout/finish/address/",
                        image_url: "https://cdn.hellofresh.com/us/cms/bags/img/2-person-veggiec-3-desktop-shop2x.jpg",
                        buttons: [{
                            type: "web_url",
                            url: "https://www.hellofresh.com/checkout/finish/address/",
                            title: "Select this Plan"
                        }],
                    }, {
                        title: "Family Plan",
                        subtitle: "Quick and easy family meals that pack in all the YUM-worthy flavor the whole family loves.",
                        item_url: "https://www.hellofresh.com/checkout/finish/address/",
                        image_url: "https://cdn.hellofresh.com/us/cms/bags/img/family-2-desktop-shop2x_AB.jpg",
                        buttons: [{
                            type: "web_url",
                            url: "https://www.hellofresh.com/checkout/finish/address/",
                            title: "Select this Plan"
                        }],
                    },]
                }
            }
        }
    };

    callSendAPI(messageData);
}

function callSendAPI(messageData) {
    request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
        method: 'POST',
        json: messageData

    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;

            console.log("Successfully sent generic message with id %s to recipient %s",
            messageId, recipientId);
        } else {
            console.error("Unable to send message.");
            console.error(response);
            console.error(error);
        }
    });
}

// Set Express to listen out for HTTP requests
var server = app.listen(process.env.PORT || 3000, function () {
    console.log("Listening on port %s", server.address().port);
});
