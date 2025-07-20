<template>
  <div class="tw-grid tw-grid-cols-1 tw-mt-1">

    <!-- Hang Up Call Button -->
    <CallTransferOptions
        v-if="transferNumbers.length"
        :transfer-numbers="transferNumbers"
        :transfer-active="transferActive"
        @transfer-call="handleCallTransfer"
        @end-call-transfer="handleEndCallTransfer"
        @disconnect-agent="handleDisconnectAgent"
        @restore-call="handleRestoreCall"
    />

    <div class="tw-flex tw-gap-1 tw-justify-between tw-mt-1">
      <!-- Mute/Unmute Button -->
      <button
          v-if="!muted"
          title="Mute"
          class="tw-w-auto tw-h-[36px] tw-bg-gray-600 hover:tw-bg-gray-700 tw-text-white tw-font-bold tw-py-2 tw-px-4 tw-rounded-sm tw-flex tw-items-center tw-justify-center tw-transition-colors"
          @click="handleMuteAudio"
      >
        <font-awesome-icon icon="fa-solid fa-microphone-lines"/>
      </button>

      <button
          v-else
          title="Unmute"
          class="tw-w-auto tw-h-[36px] tw-bg-blue-600 hover:tw-bg-blue-700 tw-text-white tw-font-bold tw-py-2 tw-px-4 tw-rounded-sm tw-flex tw-items-center tw-justify-center tw-transition-colors"
          @click="handleUnmuteAudio"
      >
        <font-awesome-icon icon="fa-solid fa-microphone-lines-slash"/>
      </button>

      <button
          title="Hang Up"
          class="tw-w-full tw-h-[36px] tw-bg-red-600 hover:tw-bg-red-700 tw-text-white tw-font-bold tw-py-2 tw-px-4 tw-rounded-sm tw-flex tw-items-center tw-justify-center tw-transition-colors"
          @click="handleEndCall"
      >
        <font-awesome-icon icon="fa-solid fa-phone-slash" class="tw-mr-2"/>
        Hang Up
      </button>
    </div>
  </div>
</template>

<script>
import CallTransferOptions from "./CallTransferOptions.vue";
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";
import {faMicrophoneLines, faMicrophoneLinesSlash} from "@fortawesome/free-solid-svg-icons";
import {library} from "@fortawesome/fontawesome-svg-core";

library.add(faMicrophoneLines, faMicrophoneLinesSlash)

export default {
  name: "ControlPanelActions",
  components: {
    CallTransferOptions,
    FontAwesomeIcon
  },
  props: {
    agentStatus: {
      type: String,
      required: true
    },
    hold: {
      type: Boolean,
      required: true,
    },
    muted: {
      type: Boolean,
      required: true,
    },
    transferNumbers: {
      type: Array,
      default: []
    },
    transferActive: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    "mute-audio",
    "unmute-audio",
    "end-call",
    "hold-call",
    "resume-call",
    "transfer-call",
    "disconnect-agent",
    "end-transfer-call",
    "restore-call"
  ],
  methods: {
    handleEndCall() {
      this.$emit("end-call", true);
    },

    handleMuteAudio() {
      this.$emit("mute-audio", true);
    },

    handleUnmuteAudio() {
      this.$emit("unmute-audio", true);
    },

    handleHoldCall() {
      this.$emit("hold-call", true)
    },

    handleResumeCall() {
      this.$emit("resume-call", true)
    },

    handleCallTransfer(transferNumber) {
      this.$emit("transfer-call", transferNumber);
    },
    handleDisconnectAgent() {
      this.$emit('disconnect-agent', true)
    },
    handleEndCallTransfer() {
      this.$emit('end-transfer-call', true)
    },
    handleRestoreCall() {
      this.$emit('restore-call', true)
    }
  },
};
</script>