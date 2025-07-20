# Twilio Softphone Implementation

This document provides an overview of the Twilio implementation of the softphone component, including setup instructions, usage guidelines, and implementation details.

## Overview

The Twilio implementation provides an alternative to the Amazon Connect implementation, allowing the softphone component to work with Twilio's Voice and TaskRouter APIs. This implementation follows the same interface as the Amazon Connect implementation, making it easy to switch between providers.

## Features

The Twilio implementation supports all the features of the Amazon Connect implementation:

- Basic call management (place, accept, decline, hang up)
- Call transfers (cold and warm)
- Conference calls
- Queue transfers
- After Call Work management
- Disposition codes
- CRM integration
- Agent state management

## Setup

### Prerequisites

To use the Twilio implementation, you need:

1. A Twilio account with Voice and TaskRouter capabilities
2. Twilio SDK libraries:
   - Twilio Voice SDK
   - Twilio TaskRouter SDK

### Installation

1. Include the Twilio SDKs in your HTML:

```html
<script src="https://sdk.twilio.com/js/client/v1.13/twilio.min.js"></script>
<script src="https://sdk.twilio.com/js/taskrouter/v1.23/taskrouter.min.js"></script>
```

2. Configure your environment variables:

```
MIX_TWILIO_ACCOUNT_SID=your_account_sid
MIX_TWILIO_AUTH_TOKEN=your_auth_token
MIX_TWILIO_WORKSPACE_SID=your_workspace_sid
```

3. Set up a backend endpoint to generate Twilio tokens:

```javascript
// Example backend endpoint (Node.js/Express)
app.get('/api/twilio/token', (req, res) => {
  const { AccessToken } = require('twilio').jwt;
  const { VoiceGrant } = AccessToken;
  
  const accessToken = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY,
    process.env.TWILIO_API_SECRET
  );
  
  accessToken.identity = req.query.identity || 'agent';
  
  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
    incomingAllow: true
  });
  
  accessToken.addGrant(voiceGrant);
  
  res.send({
    token: accessToken.toJwt()
  });
});
```

## Usage

### Selecting the Twilio Provider

To use the Twilio implementation, specify 'twilio' as the provider when getting the softphone service:

```javascript
import { getSoftphoneService } from './services/softphoneFactory';

const softphoneService = getSoftphoneService('twilio');
```

### Initializing the Softphone

Initialize the softphone with callbacks for various events:

```javascript
softphoneService.initialize({
  onStatusChange: (status) => {
    console.log(`Agent status changed to: ${status}`);
  },
  onIncomingCall: (contact) => {
    console.log('Incoming call received');
    // Show incoming call UI
  },
  onConnected: (contact) => {
    console.log('Call connected');
    // Update UI to show connected state
  },
  onCallEnded: (contact) => {
    console.log('Call ended');
    // Update UI to show idle state
  },
  onError: (error, contact) => {
    console.error('Error:', error);
    // Show error message
  }
});
```

### Making Calls

```javascript
// Place an outbound call
softphoneService.placeCall('123456789')
  .then(() => console.log('Call placed successfully'))
  .catch(error => console.error('Error placing call:', error));

// Hang up a call
softphoneService.hangUpCall()
  .then(() => console.log('Call ended successfully'))
  .catch(error => console.error('Error ending call:', error));
```

### Call Management

```javascript
// Hold a call
softphoneService.holdCall()
  .then(() => console.log('Call on hold'))
  .catch(error => console.error('Error holding call:', error));

// Resume a call
softphoneService.resumeCall()
  .then(() => console.log('Call resumed'))
  .catch(error => console.error('Error resuming call:', error));

// Mute/unmute
softphoneService.muteConnection()
  .then(() => console.log('Call muted'))
  .catch(error => console.error('Error muting call:', error));

softphoneService.unmuteConnection()
  .then(() => console.log('Call unmuted'))
  .catch(error => console.error('Error unmuting call:', error));
```

### Transfers and Conferences

```javascript
// Cold transfer to a phone number
softphoneService.transferCall('987654321', false)
  .then(() => console.log('Call transferred'))
  .catch(error => console.error('Error transferring call:', error));

// Warm transfer to a phone number
softphoneService.transferCall('987654321', true)
  .then(() => console.log('Warm transfer initiated'))
  .catch(error => console.error('Error initiating warm transfer:', error));

// Complete a warm transfer
softphoneService.endTransferCall()
  .then(() => console.log('Transfer completed'))
  .catch(error => console.error('Error completing transfer:', error));

// Transfer to a queue
softphoneService.transferToQueue('support')
  .then(() => console.log('Call transferred to queue'))
  .catch(error => console.error('Error transferring to queue:', error));

// Initiate a conference call
softphoneService.initiateConference('987654321')
  .then(() => console.log('Conference initiated'))
  .catch(error => console.error('Error initiating conference:', error));

// Merge connections into a conference
softphoneService.mergeConnections()
  .then(() => console.log('Connections merged'))
  .catch(error => console.error('Error merging connections:', error));

// Remove a participant from a conference
softphoneService.removeFromConference('conn-123')
  .then(() => console.log('Participant removed'))
  .catch(error => console.error('Error removing participant:', error));
```

### After Call Work

```javascript
// Enter After Call Work mode
softphoneService.contactService.enterAfterCallWork()
  .then(() => console.log('Entered ACW mode'))
  .catch(error => console.error('Error entering ACW:', error));

// Complete After Call Work with disposition
softphoneService.contactService.completeAfterCallWork('resolved', 'Issue resolved on first call')
  .then(() => console.log('ACW completed'))
  .catch(error => console.error('Error completing ACW:', error));

// Get remaining ACW time
const remainingTime = softphoneService.contactService.getAfterCallWorkRemainingTime();
console.log(`${remainingTime} seconds remaining in ACW`);
```

### CRM Integration

```javascript
// Get contact attributes for CRM integration
softphoneService.getContactAttributes()
  .then(attributes => {
    console.log('Contact attributes:', attributes);
    // Use attributes to look up customer in CRM
  })
  .catch(error => console.error('Error getting attributes:', error));

// Create a CRM record
const crmSystem = { type: 'salesforce', apiKey: 'your-api-key' };
const recordData = {
  name: 'John Doe',
  phone: '123456789',
  issue: 'Billing question'
};

softphoneService.createCrmRecord(crmSystem, recordData)
  .then(record => {
    console.log('CRM record created:', record);
  })
  .catch(error => console.error('Error creating record:', error));
```

## Implementation Details

### Architecture

The Twilio implementation consists of three main components:

1. **twilioService.js** - The main service that implements the ISoftphoneProviderService interface and coordinates between the agent and contact services.

2. **agentService.js** - Manages agent state and configuration using Twilio TaskRouter.

3. **contactService.js** - Manages call/contact functionality using Twilio Voice SDK.

### Twilio TaskRouter Integration

The implementation uses Twilio TaskRouter for agent state management:

- Workers represent agents
- Activities represent agent states
- Tasks represent contacts/calls
- Workspaces organize workers and queues

### Twilio Voice SDK Integration

The implementation uses Twilio Voice SDK for call management:

- Device represents the softphone
- Connections represent individual calls
- Parameters store call metadata

### Differences from Amazon Connect

While the interface is the same, there are some implementation differences:

1. **Authentication** - Twilio uses JWT tokens instead of Amazon Connect's session-based authentication.

2. **Conference Calls** - Twilio uses its Conference API for conference calls, which works differently from Amazon Connect's conference functionality.

3. **Queues** - Twilio TaskRouter queues are used instead of Amazon Connect queues.

4. **After Call Work** - Twilio doesn't have a built-in ACW concept, so it's implemented using custom TaskRouter activities.

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Ensure your Twilio tokens are valid and not expired
   - Check that your account has the necessary permissions

2. **Call Connection Issues**
   - Verify that your TwiML application is configured correctly
   - Check browser microphone permissions

3. **TaskRouter Issues**
   - Ensure your workspace is set up with the correct activities
   - Verify that your worker has the necessary attributes

### Debugging

The Twilio implementation includes debug logging:

```javascript
// Enable debug mode in Twilio Device
window.Twilio.Device.setup(token, {
  debug: true
});
```

## Future Enhancements

Potential future enhancements for the Twilio implementation:

1. **WebRTC Insights Integration** - Add support for Twilio's WebRTC Insights for call quality monitoring.

2. **Flex Integration** - Add support for Twilio Flex features if available.

3. **Enhanced Metrics** - Implement more detailed agent and call metrics using Twilio Insights API.

4. **SMS Support** - Add support for SMS messaging alongside voice calls.

5. **Video Support** - Add support for video calls using Twilio Video.