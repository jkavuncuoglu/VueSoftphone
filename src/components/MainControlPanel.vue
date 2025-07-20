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
    />

    <div class="tw-flex tw-gap-1 tw-justify-between tw-mt-1">
      <!-- Mute/Unmute Button -->
      <lift-button
          v-if="!muted"
          title="Mute"
          label=""
          color="default"
          rounded="small"
          class="tw-w-auto tw-h-[36px]"
          @click="handleMuteAudio"
      >
        <template #icon>
          <font-awesome-icon icon="fa-solid fa-microphone-lines"/>
        </template>
      </lift-button>

      <lift-button
          v-else
          title="Unmute"
          label=""
          color="info"
          rounded="small"
          class="tw-w-auto tw-h-[36px]"
          @click="handleUnmuteAudio"
      >
        <template #icon>
          <font-awesome-icon icon="fa-solid fa-microphone-lines-slash"/>
        </template>
      </lift-button>

      <lift-button
          title="Hang Up"
          label="Hang Up"
          color="danger"
          rounded="small"
          class="tw-w-full tw-h-[36px]"
          @click="handleEndCall"
      >
        <template #icon>
          <font-awesome-icon icon="fa-solid fa-phone-slash"/>
        </template>
      </lift-button>
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
    "end-transfer-call"
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
    }
  },
};
</script>