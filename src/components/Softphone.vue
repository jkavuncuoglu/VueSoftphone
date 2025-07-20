<template>
  <div class="softphone-wrapper tw-p-4 tw-border tw-border-gray-300">
    <CallStatus
        :status="agent.status"
        :muted="agent.muted"
        :show-ccp-status-actions="showCcpStatusActions"
        :show-ccp-popup-actions="showCcpPopupActions"
        :contact-active="contactActive"
        @open-ccp="openCcp"
        @call-duration="setCallDuration"
    />

    <div v-if="initialized && agent.status !== 'Initializing'">
      <component
          :is="callType === 'Incoming' ? 'IncomingCallActions' : 'OutgoingCallActions'"
          v-if="!contactActive"
          :phoneNumbers="phoneNumbers"
          @placeCall="placeCall"
          @showAdditionalPhoneNumbers="showAdditionalPhoneNumbers"
          class="tw-w-full"
      />

      <ControlPanelActions
          v-else
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
          :transferNumber="transferNumber"
      />
    </div>

    <div v-else>
      <p class="tw-text-xs tw-text-gray-500 tw-text-center tw-mt-2">
        <font-awesome-icon icon="fa-solid fa-spinner" class="tw-animate-spin"/>
        Initializing softphone...
      </p>
    </div>

    <AdditionalNumbersModal
        :visible="showAdditionalPhoneNumbersModal"
        :phoneNumbers="phoneNumbers"
        @call="placeCall"
        @close="hideAdditionalPhoneNumbers"
    />

    <CcpLoginModal
        :visible="showCcpLoginPopup"
        @login="openSoftphone"
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

import CallStatus from './CallStatus.vue';
import IncomingCallActions from './IncomingCallActions.vue';
import OutgoingCallActions from './components/OutgoingCallActions.vue';
import ControlPanelActions from "./components/ControlPanelActions.vue";
import AdditionalNumbersModal from './components/AdditionalNumbersModal.vue';
import CcpLoginModal from './components/CcpLoginModal.vue';
import agentService from "../services/providers/AmazonConnect/agentService";

import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

library.add(faSpinner)

export default {
  name: 'Softphone',
  components: {
    ControlPanelActions,
    CallStatus,
    IncomingCallActions,
    OutgoingCallActions,
    AdditionalNumbersModal,
    CcpLoginModal,
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
      callDuration: null,
      agent: {
        status: 'Initializing',
        muted: false,
        hold: false,
      },
      contactId: null,
      phoneNumber: null,
      transferNumber: null,
      showAdditionalPhoneNumbersModal: false,
      showCcpLoginPopup: false,
    };
  },
  mounted() {
    this.initializeSoftphone();
    this.initializedContactStatus();
  },
  watch: {
    'agent.status'(newStatus, oldStatus) {
      this.setupContactStatus(newStatus); // Pass the new status to setupContactStatus
    },
  },
  methods: {
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
      this.softphone.muteConnection();
    },
    handleUnmuteAudio() {
      this.softphone.unmuteConnection();
    },
    handleCallTransfer(transferNumber) {
      this.transferActive = true;

      try {
        this.softphone
            .transferCall(
                CallUtils.normalizeToE164(transferNumber.phoneNumber),
                transferNumber.warm
            )

        this.toast(
            "Transferring call...",
            "Call Transfer",
            "warning"
        )
      } catch (error) {
        this.toast(
            "Error occurred while trying to transfer call",
            "Call Transfer",
            "danger"
        )

        throw new Error(error)
      }
    },
    handleDisconnectAgent() {
      this.softphone
          .endTransferCall(true)
    },
    handleEndCallTransfer() {
      this.softphone.endTransferCall();
      this.transferActive = false;
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
    }
  },
};
</script>

<style scoped>
.softphone-wrapper {
  font-family: Arial, sans-serif;
}
</style>