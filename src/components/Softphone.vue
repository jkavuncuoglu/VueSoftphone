<template>
  <div class="softphone-wrapper tw-p-4 tw-border tw-border-gray-300">
    <CallStatus
        :status="agent.status"
        :muted="agent.muted"
        :show-ccp-status-actions="showCcpStatusActions"
        :show-ccp-popup-actions="showCcpPopupActions"
        :contact-active="contactActive"
        :provider="provider"
        @open-ccp="openCcp"
        @open-twilio-ccp="openTwilioCcp"
        @call-duration="setCallDuration"
    />

    <div v-if="initialized && agent.status !== 'Initializing'">
      <component
          :is="callType === 'Incoming' ? 'IncomingCallActions' : 'OutgoingCallActions'"
          v-if="!contactActive"
          :phoneNumbers="phoneNumbers"
          @placeCall="placeCall"
          @acceptCall="handleAcceptIncomingCall"
          @declineCall="handleDeclineIncomingCall"
          @showAdditionalPhoneNumbers="showAdditionalPhoneNumbers"
          class="tw-w-full"
      />

      <MainControlPanel
          v-else-if="!conferenceActive"
          :agent-status="agent.status"
          :hold="agent.hold"
          :muted="agent.muted"
          :transferNumbers="transferNumbers"
          :transfer-active="transferActive"
          @mute-audio="handleMuteAudio"
          @unmute-audio="handleUnmuteAudio"
          @end-call="handleEndCall"
          @transfer-call="handleCallTransfer"
          @disconnect-agent="handleDisconnectAgent"
          @end-call-transfer="handleEndCallTransfer"
          @restore-call="handleRestoreCall"
          :transferNumber="transferNumber"
      />
      
      <ConferenceCallsComponent
          v-else
          :phoneNumbers="phoneNumbers"
          :conferenceActive="conferenceActive"
          :participants="conferenceParticipants"
          @initiate-conference="handleInitiateConference"
          @merge-connections="handleMergeConnections"
          @remove-from-conference="handleRemoveFromConference"
          @end-conference="handleEndCall"
      />
    </div>

    <div v-else>
      <div class="tw-text-xs tw-text-gray-500 tw-text-center tw-mt-2">
        <p class="tw-mb-2">Initializing softphone...</p>
        <ul class="tw-space-y-2 tw-max-w-xs tw-mx-auto tw-text-left tw-bg-gray-50 tw-p-3 tw-rounded-md tw-shadow-sm">
          <li v-for="test in diagnosticTests" :key="test.id" 
              class="tw-flex tw-items-center tw-justify-between tw-p-1"
              :class="{
                'tw-bg-green-50': test.status === 'success',
                'tw-bg-red-50': test.status === 'failed',
                'tw-bg-blue-50': test.status === 'running',
              }">
            <div class="tw-flex tw-items-center">
              <!-- Test icon based on test type -->
              <span class="tw-w-6 tw-text-center">
                <font-awesome-icon :icon="getTestIcon(test.id)" 
                                  :class="{
                                    'tw-text-blue-500': test.status === 'running' || test.status === 'pending',
                                    'tw-text-green-500': test.status === 'success',
                                    'tw-text-red-500': test.status === 'failed'
                                  }" />
              </span>
              <span class="tw-ml-2">{{ test.name }}</span>
            </div>
            
            <!-- Status indicator -->
            <span class="tw-w-6 tw-text-center">
              <!-- Pending: nothing -->
              <template v-if="test.status === 'pending'"></template>
              
              <!-- Running: animated dots -->
              <template v-else-if="test.status === 'running'">
                <span class="tw-text-blue-500 tw-min-w-[20px] tw-inline-block">{{ getDotAnimationText() }}</span>
              </template>
              
              <!-- Success: green check -->
              <template v-else-if="test.status === 'success'">
                <font-awesome-icon icon="fa-solid fa-check" class="tw-text-green-500" />
              </template>
              
              <!-- Failed: red X -->
              <template v-else-if="test.status === 'failed'">
                <font-awesome-icon icon="fa-solid fa-times" class="tw-text-red-500" />
              </template>
            </span>
          </li>
        </ul>
      </div>
    </div>

    <AdditionalNumbersModal
        :visible="showAdditionalPhoneNumbersModal"
        :phoneNumbers="phoneNumbers"
        @call="placeCall"
        @close="hideAdditionalPhoneNumbers"
    />

    <CcpLoginModal
        :visible="showCcpLoginPopup"
        :provider="provider"
        @login="openSoftphone"
    />

    <DiagnosticsModal
        :visible="showDiagnosticsModal"
        :all-passed="diagnosticsAllPassed"
        :failed-tests="diagnosticsFailedTests"
        :dismissible="diagnosticsDismissible"
        @close="handleDiagnosticsClose"
        @retry="runDiagnostics"
    />

    <div
        id="ccpContainer"
        ref="ccpContainer"
        class="ccp-container tw-hidden"
    />
  </div>
</template>

<script>
import CallUtils from "../services/callUtils";
import {getSoftphoneService} from '../services/softphoneFactory';
import WebRTCDiagnosticsService from "../services/diagnostics/WebRTCDiagnosticsService";

import CallStatus from './CallStatus.vue';
import IncomingCallActions from './IncomingCallActions.vue';
import OutgoingCallActions from './OutgoingCallActions.vue';
import MainControlPanel from './MainControlPanel.vue';
import ConferenceCallActions from './ConferenceCallActions.vue';
import AdditionalNumbersModal from './AdditionalNumbersModal.vue';
import CcpLoginModal from './CcpLoginModal.vue';
import DiagnosticsModal from './DiagnosticsModal.vue';
import agentService from "../services/providers/AmazonConnect/agentService";

import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import { faSpinner, faCheck, faTimes, faMicrophone, faWifi, faGlobe, faTachometerAlt } from "@fortawesome/free-solid-svg-icons";

library.add(faSpinner, faCheck, faTimes, faMicrophone, faWifi, faGlobe, faTachometerAlt)

export default {
  name: 'Softphone',
  components: {
    MainControlPanel,
    CallStatus,
    IncomingCallActions,
    OutgoingCallActions,
    ConferenceCallsComponent: ConferenceCallActions,
    AdditionalNumbersModal,
    CcpLoginModal,
    DiagnosticsModal,
    FontAwesomeIcon
  },
  props: {
    phoneNumbers: {
      type: Array,
      required: true,
    },
    transferNumbers: {
      type: Array,
      required: true,
    },
    showCcpPopupActions: {
      type: Boolean,
      default: true
    },
    showCcpStatusActions: {
      type: Boolean,
      default: true
    },
  },
  data() {
    return {
      ccpContainer: null,
      provider: 'amazon-connect',
      softphone: null,
      callType: 'Outgoing',
      initialized: false,
      contactActive: false,
      transferActive: false,
      conferenceActive: false,
      callDuration: null,
      agent: {
        status: 'Initializing',
        muted: false,
        hold: false,
      },
      contactId: null,
      phoneNumber: null,
      transferNumber: null,
      conferenceParticipants: [],
      availableQueues: [],
      contactAttributes: null,
      crmRecords: [],
      afterCallWorkActive: false,
      afterCallWorkRemainingTime: null,
      agentStates: [],
      agentConfiguration: null,
      agentStatistics: null,
      showAdditionalPhoneNumbersModal: false,
      showCcpLoginPopup: false,
      showQueueSelectionModal: false,
      showConferenceModal: false,
      showCrmModal: false,
      // Diagnostics related state
      diagnosticsService: null,
      showDiagnosticsModal: false,
      diagnosticsAllPassed: true,
      diagnosticsFailedTests: [],
      diagnosticsDismissible: true,
      diagnosticsCompleted: false,
      // Track current diagnostic test and statuses
      currentDiagnosticTest: null,
      diagnosticTests: [
        { id: 'microphone', name: 'Microphone', status: 'pending', result: null },
        { id: 'connectivity', name: 'Network Connectivity', status: 'pending', result: null },
        { id: 'webrtc', name: 'WebRTC Stability', status: 'pending', result: null },
        { id: 'speed', name: 'Network Speed', status: 'pending', result: null }
      ],
      dotAnimationInterval: null,
      dotAnimationState: 0,
    };
  },
  mounted() {
    // Run diagnostics before initializing the softphone
    this.runDiagnostics();
  },
  watch: {
    'agent.status'(newStatus, oldStatus) {
      this.setupContactStatus(newStatus); // Pass the new status to setupContactStatus
    },
  },
  methods: {
    /**
     * Run diagnostic tests to check microphone, connectivity, WebRTC, and speed
     * @returns {Promise<void>}
     */
    async runDiagnostics() {
      try {
        // Reset diagnostics state
        this.diagnosticsAllPassed = true;
        this.diagnosticsFailedTests = [];
        this.diagnosticsCompleted = false;
        this.diagnosticsDismissible = true;
        
        // Reset test statuses
        this.diagnosticTests.forEach(test => {
          test.status = 'pending';
          test.result = null;
        });
        
        // Create diagnostics service if it doesn't exist
        if (!this.diagnosticsService) {
          this.diagnosticsService = new WebRTCDiagnosticsService();
        }
        
        // Start dot animation
        this.startDotAnimation();
        
        // Run tests sequentially
        for (const test of this.diagnosticTests) {
          // Update current test
          this.currentDiagnosticTest = test.id;
          test.status = 'running';
          
          // Run the test
          let result;
          switch (test.id) {
            case 'microphone':
              result = await this.diagnosticsService.checkMicrophonePermissions();
              break;
            case 'connectivity':
              result = await this.diagnosticsService.testNetworkConnectivity();
              break;
            case 'webrtc':
              result = await this.diagnosticsService.testWebRTCStability();
              break;
            case 'speed':
              result = await this.diagnosticsService.performSpeedTest();
              break;
          }
          
          // Update test status and result
          test.status = result.success ? 'success' : 'failed';
          test.result = result;
          
          // If test failed, add to failed tests
          if (!result.success) {
            this.diagnosticsAllPassed = false;
            this.diagnosticsFailedTests.push({
              test: test.name,
              message: result.message,
              solution: result.solution
            });
          }
        }
        
        // Stop dot animation
        this.stopDotAnimation();
        
        // If tests failed, make the modal non-dismissible for critical failures
        if (!this.diagnosticsAllPassed) {
          // Check if there are critical failures (microphone or WebRTC)
          const hasCriticalFailures = this.diagnosticsFailedTests.some(test => 
            test.test === 'Microphone' || test.test === 'WebRTC Stability'
          );
          
          this.diagnosticsDismissible = !hasCriticalFailures;
          
          // Show the diagnostics modal with results
          this.showDiagnosticsModal = true;
        }
        
        // Mark diagnostics as completed
        this.diagnosticsCompleted = true;
        this.currentDiagnosticTest = null;
        
        // If all tests passed, proceed with initialization
        if (this.diagnosticsAllPassed) {
          // Wait a moment to show all tests completed
          setTimeout(() => {
            this.proceedWithInitialization();
          }, 1500);
        }
      } catch (error) {
        console.error('Error running diagnostics:', error);
        
        // Stop dot animation
        this.stopDotAnimation();
        
        // Show error in modal
        this.diagnosticsAllPassed = false;
        this.diagnosticsFailedTests = [{
          test: 'Diagnostics',
          message: 'An error occurred while running diagnostic tests',
          solution: 'Please refresh the page and try again. If the problem persists, contact your administrator.'
        }];
        
        // Allow dismissing the error
        this.diagnosticsDismissible = true;
        this.diagnosticsCompleted = true;
        this.currentDiagnosticTest = null;
        
        // Show the diagnostics modal with error
        this.showDiagnosticsModal = true;
      }
    },
    
    /**
     * Start the dot animation for the current test
     */
    startDotAnimation() {
      // Clear any existing interval
      this.stopDotAnimation();
      
      // Reset animation state
      this.dotAnimationState = 0;
      
      // Start new interval
      this.dotAnimationInterval = setInterval(() => {
        this.dotAnimationState = (this.dotAnimationState + 1) % 4;
      }, 500);
    },
    
    /**
     * Stop the dot animation
     */
    stopDotAnimation() {
      if (this.dotAnimationInterval) {
        clearInterval(this.dotAnimationInterval);
        this.dotAnimationInterval = null;
      }
    },
    
    /**
     * Get the current dot animation text
     * @returns {string} The dot animation text
     */
    getDotAnimationText() {
      const dots = ['.', '..', '...', ''];
      return dots[this.dotAnimationState];
    },
    
    /**
     * Get the icon for a specific test type
     * @param {string} testId - The test identifier
     * @returns {string} The FontAwesome icon name
     */
    getTestIcon(testId) {
      switch (testId) {
        case 'microphone':
          return 'fa-solid fa-microphone';
        case 'connectivity':
          return 'fa-solid fa-wifi';
        case 'webrtc':
          return 'fa-solid fa-globe';
        case 'speed':
          return 'fa-solid fa-tachometer-alt';
        default:
          return 'fa-solid fa-spinner';
      }
    },
    
    /**
     * Handle closing the diagnostics modal
     */
    handleDiagnosticsClose() {
      this.showDiagnosticsModal = false;
      
      // If diagnostics are completed, proceed with initialization
      if (this.diagnosticsCompleted) {
        this.proceedWithInitialization();
      }
    },
    
    /**
     * Proceed with softphone initialization after diagnostics
     */
    proceedWithInitialization() {
      this.initializeSoftphone();
      this.initializedContactStatus();
      this.loadAgentStates();
      this.getAgentConfiguration();
    },
    
    /**
     * Initialize the softphone service
     */
    initializeSoftphone() {
      this.ccpContainer = this.$refs.ccpContainer;
      this.softphone = getSoftphoneService(this.provider);

      this.softphone.initialize({
        container: this.$refs.ccpContainer,
        onStatusChange: (status) => {
          this.handleStatusChange(status)
        },
        onMuteChange: (muted) => (this.agent.muted = muted),
        onIncomingCall: () => {
          this.callType = 'Incoming';
          this.contactActive = true;
        },
        onConnecting: (contact) => {
          this.$emit('call-started', {
            contactId: contact.getContactId(),
            patient_phone_number: this.phoneNumber,
            status: 'connecting'
          });
        },
        onCallEnded: (contact) => {
          this.contactActive = false;

          const ccpLogs = agentService.getCcpLogs()

          this.$emit('call-ended', {
            contactId: contact.getContactId(),
            ccpLogs: ccpLogs
          })
        },
        onLoginRequired: () => {
          this.showCcpLoginPopup = true;
          this.openLogin()
        },
        onLoginSuccess: () => {
          this.showCcpLoginPopup = false;
        }
      });

      this.initialized = true;
    },

    placeCall(phoneNumber) {
      this.callType = 'Outgoing';
      this.phoneNumber = CallUtils.normalizeToE164(phoneNumber);

      this.contactActive = true;
      this.softphone.placeCall(
          this.phoneNumber
      );

      this.hideAdditionalPhoneNumbers();
    },

    handleEndCall() {
      this.softphone.hangUpCall();

      this.contactActive = false;

      agentService.getAgentInstance()?.getContacts()
          .forEach((contact) => {
            this.$emit('call-ended', {
              contactId: contact.getContactId(),
              ccpLogs: agentService.getCcpLogs()
            })
          });

      if (this.agent.muted) {
        this.handleUnmuteAudio()
      }

      if (this.transferActive) {
        this.handleEndCallTransfer();
      }
    },
    handleMuteAudio() {
      this.softphone.muteConnection()
        .then(() => {
          this.agent.muted = true;
        })
        .catch(error => {
          this.toast(
            `Error muting audio: ${error.message}`,
            "Audio Error",
            "danger"
          );
        });
    },
    handleUnmuteAudio() {
      this.softphone.unmuteConnection()
        .then(() => {
          this.agent.muted = false;
        })
        .catch(error => {
          this.toast(
            `Error unmuting audio: ${error.message}`,
            "Audio Error",
            "danger"
          );
        });
    },
    handleHoldCall() {
      this.softphone.holdCall()
        .then(() => {
          this.agent.hold = true;
          this.toast(
            "Call placed on hold",
            "Call Status",
            "info"
          );
        })
        .catch(error => {
          this.toast(
            `Error placing call on hold: ${error.message}`,
            "Call Error",
            "danger"
          );
        });
    },
    handleResumeCall() {
      this.softphone.resumeCall()
        .then(() => {
          this.agent.hold = false;
          this.toast(
            "Call resumed",
            "Call Status",
            "info"
          );
        })
        .catch(error => {
          this.toast(
            `Error resuming call: ${error.message}`,
            "Call Error",
            "danger"
          );
        });
    },
    handleAcceptIncomingCall() {
      this.softphone.acceptIncomingCall()
        .then(() => {
          this.contactActive = true;
          this.callType = 'Incoming';
          this.toast(
            "Call accepted",
            "Call Status",
            "success"
          );
        })
        .catch(error => {
          this.toast(
            `Error accepting call: ${error.message}`,
            "Call Error",
            "danger"
          );
        });
    },
    handleDeclineIncomingCall() {
      this.softphone.declineIncomingCall()
        .then(() => {
          this.contactActive = false;
          this.toast(
            "Call declined",
            "Call Status",
            "info"
          );
        })
        .catch(error => {
          this.toast(
            `Error declining call: ${error.message}`,
            "Call Error",
            "danger"
          );
        });
    },
    handleCallTransfer(transferNumber) {
      this.transferActive = true;
      this.transferNumber = transferNumber;

      this.softphone
        .transferCall(
            CallUtils.normalizeToE164(transferNumber.phoneNumber),
            transferNumber.warm
        )
        .then(() => {
          this.toast(
              "Transferring call...",
              "Call Transfer",
              "warning"
          );
        })
        .catch(error => {
          this.transferActive = false;
          this.toast(
              `Error occurred while trying to transfer call: ${error.message}`,
              "Call Transfer",
              "danger"
          );
        });
    },
    handleDisconnectAgent() {
      this.softphone
        .endTransferCall(true)
        .then(() => {
          this.toast(
              "Agent disconnected from call",
              "Call Transfer",
              "info"
          );
        })
        .catch(error => {
          this.toast(
              `Error disconnecting agent: ${error.message}`,
              "Call Transfer",
              "danger"
          );
        });
    },
    handleEndCallTransfer() {
      this.softphone.endTransferCall()
        .then(() => {
          this.transferActive = false;
          this.toast(
              "Transfer ended",
              "Call Transfer",
              "info"
          );
        })
        .catch(error => {
          this.toast(
              `Error ending transfer: ${error.message}`,
              "Call Transfer",
              "danger"
          );
        });
    },
    handleRestoreCall() {
      this.softphone.restoreCall()
        .then(() => {
          this.toast(
              "Call restored",
              "Call Transfer",
              "success"
          );
        })
        .catch(error => {
          this.toast(
              `Error restoring call: ${error.message}`,
              "Call Transfer",
              "danger"
          );
        });
    },
    handleTransferToQueue(queueId) {
      this.transferActive = true;
      
      this.softphone.transferToQueue(queueId)
        .then(() => {
          this.toast(
              "Transferring call to queue...",
              "Queue Transfer",
              "warning"
          );
        })
        .catch(error => {
          this.transferActive = false;
          this.toast(
              `Error transferring to queue: ${error.message}`,
              "Queue Transfer",
              "danger"
          );
        });
    },
    handleWarmTransferToQueue(queueId) {
      this.transferActive = true;
      
      this.softphone.warmTransferToQueue(queueId)
        .then(() => {
          this.toast(
              "Initiating warm transfer to queue...",
              "Queue Transfer",
              "warning"
          );
        })
        .catch(error => {
          this.transferActive = false;
          this.toast(
              `Error initiating warm transfer to queue: ${error.message}`,
              "Queue Transfer",
              "danger"
          );
        });
    },
    loadAvailableQueues() {
      this.softphone.getAvailableQueues()
        .then(queues => {
          this.availableQueues = queues;
          this.showQueueSelectionModal = true;
        })
        .catch(error => {
          this.toast(
              `Error loading available queues: ${error.message}`,
              "Queue Error",
              "danger"
          );
        });
    },
    handleInitiateConference(phoneNumber) {
      this.conferenceActive = true;
      
      this.softphone.initiateConference(phoneNumber)
        .then(() => {
          this.toast(
              "Initiating conference call...",
              "Conference",
              "info"
          );
          
          // Add participant to the list
          this.conferenceParticipants.push({
            phoneNumber,
            timestamp: new Date().toISOString(),
            status: 'connecting'
          });
        })
        .catch(error => {
          this.conferenceActive = false;
          this.toast(
              `Error initiating conference: ${error.message}`,
              "Conference",
              "danger"
          );
        });
    },
    handleMergeConnections() {
      this.softphone.mergeConnections()
        .then(() => {
          this.toast(
              "Conference participants merged",
              "Conference",
              "success"
          );
          
          // Update all participants status
          this.conferenceParticipants.forEach(participant => {
            participant.status = 'connected';
          });
        })
        .catch(error => {
          this.toast(
              `Error merging connections: ${error.message}`,
              "Conference",
              "danger"
          );
        });
    },
    handleRemoveFromConference(participant) {
      // Extract connectionId from participant object if it's an object, otherwise use it directly
      const connectionId = participant.connectionId || participant;
      
      this.softphone.removeFromConference(connectionId)
        .then(() => {
          this.toast(
              "Participant removed from conference",
              "Conference",
              "info"
          );
          
          // Remove participant from the list or update status
          const index = this.conferenceParticipants.findIndex(p => 
            (p.connectionId === connectionId) || 
            (p.phoneNumber === participant.phoneNumber)
          );
          
          if (index !== -1) {
            this.conferenceParticipants.splice(index, 1);
          }
          
          // If no participants left, end conference
          if (this.conferenceParticipants.length === 0) {
            this.conferenceActive = false;
          }
        })
        .catch(error => {
          this.toast(
              `Error removing participant: ${error.message}`,
              "Conference",
              "danger"
          );
        });
    },
    handleStatusChange(status) {
      this.agent.status = status;

      if (status === 'FailedConnectCustomer') {

        this.$emit('call-error', 'FailedToConnect')

        this.toast(
            'Connection was blocked.',
            "Call Error",
            "danger"
        )

        this.handleEndCall()
      }

    },
    showAdditionalPhoneNumbers() {
      this.showAdditionalPhoneNumbersModal = true;
    },
    hideAdditionalPhoneNumbers() {
      this.showAdditionalPhoneNumbersModal = false;
    },
    openCcp() {
      const ccpWindow = window.open(
          `https://${process.env.MIX_AWS_CONNECT_URL}/connect/ccp-v2/softphone`,
          "Amazon Connect Control Panel",
          "toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, close=no, width=393, height=572"
      );

      if (!ccpWindow) {
        this.toast(
            "Failed to open the Amazon Connect Control Panel. Please check your popup blocker settings.",
            "CCP Error",
            "danger"
        );
      }

      const checkWindowClosedInterval = setInterval(() => {
        if (ccpWindow.closed) {
          clearInterval(checkWindowClosedInterval); // Clear interval

          this.showCcpLoginPopup = false;

          this.initializeSoftphone()
        }
      });
    },
    
    openTwilioCcp() {
      // URL for Twilio console or custom Twilio interface
      const twilioUrl = process.env.MIX_TWILIO_CONSOLE_URL || 'https://www.twilio.com/console/voice';
      
      const ccpWindow = window.open(
          twilioUrl,
          "Twilio Control Panel",
          "toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=yes, copyhistory=no, close=no, width=800, height=600"
      );

      if (!ccpWindow) {
        this.toast(
            "Failed to open the Twilio Control Panel. Please check your popup blocker settings.",
            "Twilio Panel Error",
            "danger"
        );
      }

      const checkWindowClosedInterval = setInterval(() => {
        if (ccpWindow.closed) {
          clearInterval(checkWindowClosedInterval); // Clear interval
          
          // Reinitialize if needed
          if (this.provider === 'twilio') {
            this.initializeSoftphone();
          }
        }
      });
    },
    openSoftphone() {
      this.showCcpLoginPopup = false;
      this.softphone.openLogin();
    },
    initializedContactStatus() {
      this.setupContactStatus();

      if (this.agent.status === 'CallingCustomer') {
        this.handleEndCall();
      }
    },
    setupContactStatus() {
      if (this.agent?.status === 'Busy' && !this.contactActive) {
        this.contactActive = true;
      }

      if (this.agent?.status === 'AfterCallWork' && this.contactActive) {
        this.handleEndCall()
        if (this.agent.muted) {
          this.handleUnmuteAudio();
        }
      }
    },
    setCallDuration(duration) {
      this.callDuration = duration
    },
    
    // CRM Integration Methods
    getContactAttributes() {
      this.softphone.getContactAttributes()
        .then(attributes => {
          this.contactAttributes = attributes;
          this.$emit('contact-attributes', attributes);
        })
        .catch(error => {
          this.toast(
            `Error getting contact attributes: ${error.message}`,
            "CRM Error",
            "danger"
          );
        });
    },
    
    createCrmRecord(crmSystem, recordData) {
      this.softphone.createCrmRecord(crmSystem, recordData)
        .then(record => {
          this.crmRecords.push(record);
          this.$emit('crm-record-created', record);
          this.toast(
            "CRM record created successfully",
            "CRM Integration",
            "success"
          );
        })
        .catch(error => {
          this.toast(
            `Error creating CRM record: ${error.message}`,
            "CRM Error",
            "danger"
          );
        });
    },
    
    updateCrmRecord(crmSystem, recordId, updateData) {
      this.softphone.updateCrmRecord(crmSystem, recordId, updateData)
        .then(record => {
          // Update the record in the array
          const index = this.crmRecords.findIndex(r => r.recordId === recordId);
          if (index !== -1) {
            this.crmRecords[index] = record;
          }
          
          this.$emit('crm-record-updated', record);
          this.toast(
            "CRM record updated successfully",
            "CRM Integration",
            "success"
          );
        })
        .catch(error => {
          this.toast(
            `Error updating CRM record: ${error.message}`,
            "CRM Error",
            "danger"
          );
        });
    },
    
    searchCustomerByPhone(crmSystem, phoneNumber) {
      this.softphone.searchCustomerByPhone(crmSystem, phoneNumber)
        .then(results => {
          this.$emit('customer-search-results', results);
          
          if (results.results && results.results.length > 0) {
            this.toast(
              `Found ${results.results.length} customer records`,
              "CRM Search",
              "info"
            );
          } else {
            this.toast(
              "No customer records found",
              "CRM Search",
              "warning"
            );
          }
        })
        .catch(error => {
          this.toast(
            `Error searching for customer: ${error.message}`,
            "CRM Error",
            "danger"
          );
        });
    },
    
    // Agent State Management Methods
    loadAgentStates() {
      // Import agentService directly to access static methods
      const agentService = require('../services/providers/AmazonConnect/agentService').default;
      
      agentService.getAvailableAgentStates()
        .then(states => {
          this.agentStates = states;
        })
        .catch(error => {
          this.toast(
            `Error loading agent states: ${error.message}`,
            "Agent Error",
            "danger"
          );
        });
    },
    
    getAgentConfiguration() {
      // Import agentService directly to access static methods
      const agentService = require('../services/providers/AmazonConnect/agentService').default;
      
      agentService.getAgentConfiguration()
        .then(config => {
          this.agentConfiguration = config;
        })
        .catch(error => {
          this.toast(
            `Error getting agent configuration: ${error.message}`,
            "Agent Error",
            "danger"
          );
        });
    },
    
    updateAgentConfiguration(configUpdates) {
      // Import agentService directly to access static methods
      const agentService = require('../services/providers/AmazonConnect/agentService').default;
      
      agentService.updateAgentConfiguration(configUpdates)
        .then(config => {
          this.agentConfiguration = config;
          this.toast(
            "Agent configuration updated",
            "Agent Configuration",
            "success"
          );
        })
        .catch(error => {
          this.toast(
            `Error updating agent configuration: ${error.message}`,
            "Agent Error",
            "danger"
          );
        });
    },
    
    getAgentStatistics() {
      // Import agentService directly to access static methods
      const agentService = require('../services/providers/AmazonConnect/agentService').default;
      
      agentService.getAgentStatistics()
        .then(stats => {
          this.agentStatistics = stats;
          this.$emit('agent-statistics', stats);
        })
        .catch(error => {
          this.toast(
            `Error getting agent statistics: ${error.message}`,
            "Agent Error",
            "danger"
          );
        });
    },
    
    getAgentSnapshot() {
      // Import agentService directly to access static methods
      const agentService = require('../services/providers/AmazonConnect/agentService').default;
      
      agentService.getAgentSnapshot()
        .then(snapshot => {
          // Update relevant component state with snapshot data
          this.$emit('agent-snapshot', snapshot);
        })
        .catch(error => {
          this.toast(
            `Error getting agent snapshot: ${error.message}`,
            "Agent Error",
            "danger"
          );
        });
    },
    
    getAgentContacts() {
      // Import agentService directly to access static methods
      const agentService = require('../services/providers/AmazonConnect/agentService').default;
      
      agentService.getAgentContacts()
        .then(contacts => {
          this.$emit('agent-contacts', contacts);
        })
        .catch(error => {
          this.toast(
            `Error getting agent contacts: ${error.message}`,
            "Agent Error",
            "danger"
          );
        });
    },
    
    getAgentPermissions() {
      // Import agentService directly to access static methods
      const agentService = require('../services/providers/AmazonConnect/agentService').default;
      
      agentService.getAgentPermissions()
        .then(permissions => {
          this.$emit('agent-permissions', permissions);
        })
        .catch(error => {
          this.toast(
            `Error getting agent permissions: ${error.message}`,
            "Agent Error",
            "danger"
          );
        });
    },
    
    setAgentRoutingState(stateName) {
      // Import agentService directly to access static methods
      const agentService = require('../services/providers/AmazonConnect/agentService').default;
      
      agentService.setRoutingState(stateName)
        .then(newState => {
          this.toast(
            `Agent state changed to: ${newState}`,
            "Agent State",
            "info"
          );
        })
        .catch(error => {
          this.toast(
            `Error setting agent state: ${error.message}`,
            "Agent Error",
            "danger"
          );
        });
    },
    
    logoutAgent() {
      // Import agentService directly to access static methods
      const agentService = require('../services/providers/AmazonConnect/agentService').default;
      
      agentService.logout()
        .then(() => {
          this.toast(
            "Agent logged out successfully",
            "Agent Logout",
            "success"
          );
          
          // Reset component state
          this.initialized = false;
          this.agent.status = 'Initializing';
          this.contactActive = false;
          this.transferActive = false;
          this.conferenceActive = false;
          
          // Show login popup
          this.showCcpLoginPopup = true;
        })
        .catch(error => {
          this.toast(
            `Error logging out agent: ${error.message}`,
            "Agent Error",
            "danger"
          );
        });
    },
    
    // Helper method for toast notifications
    toast(message, title, type) {
      // This is a placeholder for a toast notification system
      // In a real implementation, this would use a toast library or custom event
      console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
      
      // If a toast notification system is available, use it
      if (this.$toast) {
        this.$toast[type](message, title);
      }
    }
  },
};
</script>

<style scoped>
.softphone-wrapper {
  font-family: Arial, sans-serif;
}
</style>