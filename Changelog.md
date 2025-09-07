# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project adheres to Semantic Versioning.

## [1.0.0] - 2025-07-21

Initial release of Vue Softphone, a provider‑independent Vue.js 2 softphone component.

### Added
- Complete softphone UI with call controls (mute/unmute, hold/resume, hang up)
- Incoming and outgoing call handling
- Call transfer functionality (warm and cold)
- Conference call support
- Built-in WebRTC diagnostics (microphone, connectivity, and stability checks)
- TailwindCSS and FontAwesome integration
- Modular, provider‑agnostic architecture with service abstraction
- Amazon Connect provider implementation (agent and contact services)
- Twilio provider implementation (agent and contact services)
- Factory for provider selection (`getSoftphoneService`)
- Emitted events: `call-started`, `call-ended`

### Documentation
- README with installation, usage, and API reference
- v1.0.0 release notes

### Notes
- Targets Vue 2.x
- Provider interface defined to facilitate future provider additions

[1.0.0]: https://www.npmjs.com/package/vue-softphone/v/1.0.0