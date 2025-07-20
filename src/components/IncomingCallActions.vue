<template>
  <div class="tw-flex tw-w-full tw-gap-1">
    <!-- Accept Call Button -->
    <button
        title="Accept Call"
        class="tw-w-full tw-bg-green-600 hover:tw-bg-green-700 tw-text-white tw-font-bold tw-py-2 tw-px-4 tw-rounded-sm tw-flex tw-items-center tw-justify-center tw-transition-colors"
        @click="acceptCall"
    >
      <font-awesome-icon icon="fa-solid fa-phone-volume" class="tw-mr-2"/>
      Accept Call
    </button>

    <!-- Decline Call Button -->
    <button
        title="Decline Call"
        class="tw-w-full tw-bg-red-600 hover:tw-bg-red-700 tw-text-white tw-font-bold tw-py-2 tw-px-4 tw-rounded-sm tw-flex tw-items-center tw-justify-center tw-transition-colors"
        @click="declineCall"
    >
      <font-awesome-icon icon="fa-solid fa-phone-slash" class="tw-mr-2"/>
      Decline Call
    </button>
  </div>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import { faPhoneVolume, faPhoneSlash } from "@fortawesome/free-solid-svg-icons";

library.add(faPhoneVolume, faPhoneSlash)

export default {
  name: "IncomingCallActions",
  components: {
    FontAwesomeIcon
  },
  emits: ["acceptCall", "declineCall"],
  methods: {
    acceptCall() {
      this.$emit("acceptCall");
    },
    declineCall() {
      this.$emit("declineCall");
    },
  },
};
</script>