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
    <div v-if="showCcpStatusActions">
      <lift-button
          v-if="status === 'Offline'"
          title="Set Status Available"
          label=""
          color="default"
          class="tw-m-0 tw-h-[36px] tw-w-full mb-1"
          @click="setAgentStatus('Available')"
      >
        <template #icon>
          <font-awesome-icon icon="fa-solid fa-signal"/>
        </template>
      </lift-button>
      <lift-button
          v-if="status === 'Available'"
          title="Set Status Offline"
          label=""
          color="default"
          class="tw-w-full tw-m-0 tw-min-h-[36px] tw-h-full mb-1"
          @click="setAgentStatus('Offline')"
      >
        <template #icon>
          <font-awesome-icon icon="fa-solid fa-power-off"/>
        </template>
      </lift-button>
    </div>
    <div v-if="showCcpPopupActions">
      <lift-button
          title="Open Amazon Connect Control Panel"
          label=""
          color="default"
          class="tw-w-full tw-m-0 tw-min-h-[36px] tw-h-full"
          @click="openAwsCcp"
      >
        <template #icon>
          <font-awesome-icon icon="fa-solid fa-headset"/>
        </template>
      </lift-button>
    </div>
  </div>
</template>

<script>
import agentService from "../services/providers/AmazonConnect/agentService";
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
    }
  },
  emits: ['open-ccp', 'call-duration'],
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
    setAgentStatus(status) {
      agentService.setAgentStatus(status);
    },
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
    startTimer() {
      this.intervalId = setInterval(() => {
        this.elapsedTime++;
      }, 1000);
    },
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