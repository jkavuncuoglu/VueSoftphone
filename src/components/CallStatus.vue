<template>
  <div class="tw-w-full tw-flex tw-gap-1">
    <div
        class="tw-border tw-border-charcoal-600 tw-bg-gray-100 tw-min-h-[36px] tw-p-2 tw-w-full tw-text-center tw-text-xs tw-font-bold tw-shadow-[inset_0px_1px_2px_0px_rgba(0,_0,_0,_0.1)]"
        :class="[status, { muted }]"
    >
      <p>
      <span v-if="!muted">
        {{ formatStatus(status) }}
      </span>
        <span v-else>
        <font-awesome-icon icon="fa-solid fa-microphone-lines-slash" class="tw-text-xxs"/> You're Muted
      </span>
      </p>
      <p class="tw-text-xxs" v-if="contactActive">
        {{ callDuration }}
      </p>
    </div>
    <div v-if="showCcpStatusActions && isAmazonConnect">
      <button
          v-if="status === 'Offline'"
          title="Set Status Available"
          class="tw-m-0 tw-h-[36px] tw-w-full mb-1 tw-bg-gray-600 hover:tw-bg-gray-700 tw-text-white tw-font-bold tw-py-2 tw-px-4 tw-rounded-sm tw-flex tw-items-center tw-justify-center tw-transition-colors"
          @click="setAgentStatus('Available')"
      >
        <font-awesome-icon icon="fa-solid fa-signal"/>
      </button>
      <button
          v-if="status === 'Available'"
          title="Set Status Offline"
          class="tw-w-full tw-m-0 tw-min-h-[36px] tw-h-full mb-1 tw-bg-gray-600 hover:tw-bg-gray-700 tw-text-white tw-font-bold tw-py-2 tw-px-4 tw-rounded-sm tw-flex tw-items-center tw-justify-center tw-transition-colors"
          @click="setAgentStatus('Offline')"
      >
        <font-awesome-icon icon="fa-solid fa-power-off"/>
      </button>
    </div>
    <div v-if="showCcpStatusActions && isTwilio">
      <button
          v-if="status === 'Offline'"
          title="Set Twilio Status Available"
          class="tw-m-0 tw-h-[36px] tw-w-full mb-1 tw-bg-blue-600 hover:tw-bg-blue-700 tw-text-white tw-font-bold tw-py-2 tw-px-4 tw-rounded-sm tw-flex tw-items-center tw-justify-center tw-transition-colors"
          @click="setTwilioAgentStatus('Available')"
      >
        <font-awesome-icon icon="fa-solid fa-signal" class="tw-mr-2"/>
        Available
      </button>
      <button
          v-if="status === 'Available'"
          title="Set Twilio Status Offline"
          class="tw-w-full tw-m-0 tw-min-h-[36px] tw-h-full mb-1 tw-bg-red-600 hover:tw-bg-red-700 tw-text-white tw-font-bold tw-py-2 tw-px-4 tw-rounded-sm tw-flex tw-items-center tw-justify-center tw-transition-colors"
          @click="setTwilioAgentStatus('Offline')"
      >
        <font-awesome-icon icon="fa-solid fa-power-off" class="tw-mr-2"/>
        Offline
      </button>
    </div>
    <div v-if="showCcpPopupActions && isAmazonConnect">
      <button
          title="Open Amazon Connect Control Panel"
          class="tw-w-full tw-m-0 tw-min-h-[36px] tw-h-full tw-bg-gray-600 hover:tw-bg-gray-700 tw-text-white tw-font-bold tw-py-2 tw-px-4 tw-rounded-sm tw-flex tw-items-center tw-justify-center tw-transition-colors"
          @click="openAwsCcp"
      >
        <font-awesome-icon icon="fa-solid fa-headset"/>
      </button>
    </div>
    <div v-if="showCcpPopupActions && isTwilio">
      <button
          title="Open Twilio Control Panel"
          class="tw-w-full tw-m-0 tw-min-h-[36px] tw-h-full tw-bg-blue-600 hover:tw-bg-blue-700 tw-text-white tw-font-bold tw-py-2 tw-px-4 tw-rounded-sm tw-flex tw-items-center tw-justify-center tw-transition-colors"
          @click="openTwilioCcp"
      >
        <font-awesome-icon icon="fa-solid fa-headset" class="tw-mr-2"/>
        Twilio Panel
      </button>
    </div>
  </div>
</template>

<script>
import amazonAgentService from "../services/providers/AmazonConnect/agentService";
import twilioAgentService from "../services/providers/Twilio/agentService";
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";
import {library} from "@fortawesome/fontawesome-svg-core";
import {faHeadset, faPowerOff, faSignal, faMicrophoneLinesSlash} from "@fortawesome/free-solid-svg-icons";

library.add(faHeadset, faPowerOff, faSignal, faMicrophoneLinesSlash)

export default {
  name: "CallStatus",
  components: {
    FontAwesomeIcon
  },
  props: {
    showCcpStatusActions: {
      type: Boolean,
      required: true
    },
    showCcpPopupActions: {
      type: Boolean,
      required: true
    },
    status: {
      type: String,
      required: true,
    },
    muted: {
      type: Boolean,
      required: true,
    },
    contactActive: {
      type: Boolean,
      default: false
    },
    provider: {
      type: String,
      default: 'amazon-connect'
    }
  },
  emits: ['open-ccp', 'open-twilio-ccp', 'call-duration'],
  data() {
    return {
      intervalId: null,
      elapsedTime: 0
    }
  },
  watch: {
    contactActive(newValue) {
      if (newValue) {
        return this.startTimer()
      }

      return this.stopTimer()
    }
  },
  computed: {
    isAmazonConnect() {
      return this.provider === 'amazon-connect';
    },
    isTwilio() {
      return this.provider === 'twilio';
    },
    callDuration: {
      get() {
        const hours = String(Math.floor(this.elapsedTime / 3600)).padStart(2, "0");
        const minutes = String(Math.floor((this.elapsedTime % 3600) / 60)).padStart(2, "0");
        const seconds = String(this.elapsedTime % 60).padStart(2, "0");
        return `${hours}:${minutes}:${seconds}`;
      },
      set(newValue) {
        const parts = newValue.split(":");
        // Assuming the format is always hh:mm:ss and reverse-calculating elapsedTime
        this.elapsedTime =
            parseInt(parts[0], 10) * 3600 +
            parseInt(parts[1], 10) * 60 +
            parseInt(parts[2], 10);
      },
    }
  },
  methods: {
    /**
     * Method to open the AWS CCP (Control Center Panel).
     */
    openAwsCcp() {
      this.$emit("open-ccp", true);
    },
    
    /**
     * Method to open the Twilio Control Panel.
     */
    openTwilioCcp() {
      this.$emit("open-twilio-ccp", true);
    },
    
    /**
     * Set Amazon Connect agent status
     * @param {string} status - The status to set
     */
    setAgentStatus(status) {
      try {
        amazonAgentService.setAgentStatus(status)
          .then(() => {
            console.log(`Amazon Connect agent status set to: ${status}`);
          })
          .catch(error => {
            console.error(`Error setting Amazon Connect agent status: ${error.message}`);
          });
      } catch (error) {
        console.error(`Error setting Amazon Connect agent status: ${error.message}`);
      }
    },
    
    /**
     * Set Twilio agent status
     * @param {string} status - The status to set
     */
    setTwilioAgentStatus(status) {
      try {
        twilioAgentService.setAgentStatus(status)
          .then(() => {
            console.log(`Twilio agent status set to: ${status}`);
          })
          .catch(error => {
            console.error(`Error setting Twilio agent status: ${error.message}`);
          });
      } catch (error) {
        console.error(`Error setting Twilio agent status: ${error.message}`);
      }
    },
    
    /**
     * Format the status text for display
     * @param {string} string - The status string to format
     * @returns {string} - The formatted status string
     */
    formatStatus(string) {
      switch (string) {
        case 'CallingCustomer':
          return 'Calling Patient';
        case 'Busy':
          return 'Connected';
        case 'AfterCallWork':
        case 'Available':
        case 'Offline':
          return 'Ready To Call';
        default:
          return this.ucWords(string);
      }
    },
    
    /**
     * Convert a string to title case (first letter of each word capitalized)
     * @param {string} str - The string to convert
     * @returns {string} - The converted string
     */
    ucWords(str) {
      if (!str) return '';
      return str
        .toLowerCase()
        .replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
    },
    
    /**
     * Start the call duration timer
     */
    startTimer() {
      this.intervalId = setInterval(() => {
        this.elapsedTime++;
      }, 1000);
    },
    
    /**
     * Stop the call duration timer and emit the duration
     */
    stopTimer() {
      const duration = this.callDuration
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.$emit('call-duration', duration)
      this.elapsedTime = 0;
      this.callDuration = '00:00:00'
    },
  },
};
</script>

<style scoped>
.Initializing {
  @apply tw-bg-blue-100 tw-text-blueGray-800;
}

.Available,
.Busy,
.AfterCallWork {
  @apply tw-bg-green-100 tw-text-green-800;
}

.Offline,
.LoggedOut {
  @apply tw-bg-red-200 tw-text-red-800;
}

.muted,
.CallingCustomer {
  @apply tw-bg-yellow-100 tw-text-yellow-800;
}
</style>