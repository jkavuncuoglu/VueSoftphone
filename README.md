# Vue Softphone v2

[![npm version](https://img.shields.io/npm/v/vue-softphone.svg)](https://www.npmjs.com/package/vue-softphone)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A provider-independent Vue.js 2 softphone component that works with multiple telephony providers including Amazon Connect, Twilio, and more. This component provides a modular and provider-agnostic call control panel, making future migrations between providers seamless and low-effort.

## Features

- 📞 Complete softphone UI with call controls
- 🔄 Provider-independent architecture (Amazon Connect, Twilio)
- 📱 Incoming and outgoing call handling
- 🔀 Call transfer functionality (warm and cold)
- 👥 Conference call support
- 🔊 Audio controls (mute/unmute)
- ⏸️ Call management (hold/resume)
- 🔍 Built-in WebRTC diagnostics
- 🎨 Customizable styling with TailwindCSS

## Installation

### NPM

```bash
npm install vue-softphone
```

### Yarn

```bash
yarn add vue-softphone
```

### Peer Dependencies

This component requires the following peer dependencies:

```bash
npm install vue@^2.6.0 @fortawesome/fontawesome-svg-core@^6.0.0 @fortawesome/free-solid-svg-icons@^6.0.0 @fortawesome/vue-fontawesome@^2.0.0
```

## Basic Usage

### Global Registration

```javascript
import Vue from 'vue';
import VueSoftphone from 'vue-softphone';

Vue.use(VueSoftphone);
```

### Local Registration

```javascript
import { Softphone } from 'vue-softphone';

export default {
  components: {
    Softphone
  }
}
```

### Template Usage

```html
<template>
  <div>
    <Softphone 
      :phone-numbers="phoneNumbers"
      :transfer-numbers="transferNumbers"
      :show-ccp-popup-actions="true"
      :show-ccp-status-actions="true"
      @call-started="handleCallStarted"
      @call-ended="handleCallEnded"
    />
  </div>
</template>

<script>
export default {
  data() {
    return {
      phoneNumbers: [
        { label: 'Main Office', number: '+15551234567' },
        { label: 'Support', number: '+15557654321' }
      ],
      transferNumbers: [
        { label: 'Sales Team', number: '+15559876543' },
        { label: 'Customer Service', number: '+15551234567' }
      ]
    }
  },
  methods: {
    handleCallStarted(callData) {
      console.log('Call started:', callData);
    },
    handleCallEnded(callData) {
      console.log('Call ended:', callData);
    }
  }
}
</script>
```

## 🧩 Architecture Overview

### Components

| Component | Description |
|-----------|-------------|
| `Softphone.vue` | Main component that integrates all sub-components and manages state |
| `CallStatus.vue` | Shows agent connection/mute status |
| `MainControlPanel.vue` | Core call control actions (Mute, Hang Up, Transfer) |
| `IncomingCallActions.vue` | Accept/Decline buttons for inbound calls |
| `OutgoingCallActions.vue` | Outbound call initiation interface |
| `ConferenceCallActions.vue` | Manages conference call functionality |
| `AdditionalNumbersModal.vue` | Modal for selecting phone numbers |
| `CcpLoginModal.vue` | Handles login prompts for CCP providers |
| `DiagnosticsModal.vue` | Displays diagnostic test results |

### Services Structure

| Service | Description |
|---------|-------------|
| `softphoneFactory.js` | Returns the correct provider service instance |
| `providers/AmazonConnect/amazonConnectService.js` | Amazon Connect implementation |
| `providers/AmazonConnect/agentService.js` | Manages agent lifecycle and state for Amazon Connect |
| `providers/AmazonConnect/contactService.js` | Handles contact events for Amazon Connect |
| `providers/Twilio/twilioService.js` | Twilio implementation |
| `providers/Twilio/agentService.js` | Manages agent lifecycle and state for Twilio |
| `providers/Twilio/contactService.js` | Handles contact events for Twilio |
| `callUtils.js` | Shared helper functions |
| `diagnostics/WebRTCDiagnosticsService.js` | Performs WebRTC diagnostic tests |

## Provider Configuration

### Amazon Connect

```javascript
// In your main.js or component
import { getSoftphoneService } from 'vue-softphone/src/services/softphoneFactory';

// Amazon Connect is the default provider
const softphoneService = getSoftphoneService('amazon-connect');

// Initialize with your Amazon Connect configuration
softphoneService.initialize({
  container: document.getElementById('ccp-container'),
  ccpUrl: 'https://your-instance-name.awsapps.com/connect/ccp-v2/',
  onStatusChange: (status) => console.log(`Agent status: ${status}`),
  onIncomingCall: () => console.log('Incoming call'),
  onCallEnded: (contact) => console.log('Call ended')
});
```

### Twilio

```javascript
// In your main.js or component
import { getSoftphoneService } from 'vue-softphone/src/services/softphoneFactory';

// Specify Twilio as the provider
const softphoneService = getSoftphoneService('twilio');

// Initialize with your Twilio configuration
softphoneService.initialize({
  container: document.getElementById('twilio-container'),
  onStatusChange: (status) => console.log(`Agent status: ${status}`),
  onIncomingCall: () => console.log('Incoming call'),
  onCallEnded: (contact) => console.log('Call ended')
});
```

## API Reference

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| phoneNumbers | Array | Yes | - | Array of phone numbers for outgoing calls |
| transferNumbers | Array | Yes | - | Array of phone numbers for call transfers |
| showCcpPopupActions | Boolean | No | true | Show/hide CCP popup actions |
| showCcpStatusActions | Boolean | No | true | Show/hide CCP status actions |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| call-started | { contactId, patient_phone_number, status } | Emitted when a call is started |
| call-ended | { contactId, ccpLogs } | Emitted when a call ends |

### Phone Number Format

Both `phoneNumbers` and `transferNumbers` should be arrays of objects with the following structure:

```javascript
{
  label: 'Display Name',
  number: '+15551234567' // E.164 format recommended
}
```

## Softphone Provider Interface

All provider implementations follow a common interface:

```javascript
// Methods that all providers implement
interface ISoftphoneProviderService {
  initialize(options);
  placeCall(phoneNumber);
  hangUpCall();
  acceptIncomingCall();
  declineIncomingCall();
  transferCall(number, isWarmTransfer);
  endTransferCall(isAgentDisconnect);
  holdCall();
  resumeCall();
  mute();
  unmute();
  openLogin();
}
```

## ➕ Adding a New Provider

1. Create a new service file in `src/services/providers/YourProvider/` (e.g., `zoomPhoneService.js`)
2. Implement the `ISoftphoneProviderService` interface methods
3. Register the provider in `softphoneFactory.js`:

```javascript
// softphoneFactory.js
import amazonConnectService from './providers/AmazonConnect/amazonConnectService';
import twilioService from './providers/Twilio/twilioService';
import zoomPhoneService from './providers/ZoomPhone/zoomPhoneService';

export function getSoftphoneService(provider = 'amazon-connect') {
    switch (provider) {
        case 'amazon-connect':
            return amazonConnectService;
        case 'twilio':
            return twilioService;
        case 'zoom-phone':
            return zoomPhoneService;
        default:
            throw new Error(`Unknown telephony provider: ${provider}`);
    }
}
```

## 🔍 Diagnostics

The component includes built-in WebRTC diagnostics that run automatically on initialization:

- Microphone permissions check
- Network connectivity test
- WebRTC stability test
- Network speed test

If any critical tests fail (microphone or WebRTC), a non-dismissible modal will be displayed to help the user resolve the issues.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
5. Submit a pull request

### 🛠️ Development Setup

```bash
# Install dependencies
npm install

# Build for development
npm run build

# Run tests
npm test
```

## 🧪 Testing

The component includes comprehensive tests using Jest:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 💼 Author

Jeremy Kavuncuoglu <jkavuncuoglu@outlook.com>

## 💖 Support This Project

If you find this project useful, you can help keep it alive and growing! Your support allows me to:

- Dedicate more time to development and maintenance
- Cover hosting, tools, and other project costs
- Build new features and improvements

Even a small contribution goes a long way. You can support the project in any of these ways:

- [Sponsor me on GitHub](https://github.com/sponsors/jkavuncuoglu)
- [Buy me a coffee](https://buymeacoffee.com/jkavuncuoglu)

Thank you for helping make this project better and accessible for everyone! 🚀
