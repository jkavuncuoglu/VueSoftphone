<template>
  <div class="tw-w-full">
    <div class="tw-relative tw-inline-block tw-text-left tw-w-full" v-if="!transferActive">
      <button
          title="Transfer Call"
          class="tw-w-full tw-h-[36px] tw-bg-blue-600 hover:tw-bg-blue-700 tw-px-3 tw-py-1.5 tw-text-md tw-rounded-sm tw-transition-all tw-duration-300 tw-ease-in-out tw-text-white tw-flex tw-items-center tw-justify-center"
          :disabled="!transferNumbers.length"
          @click="toggleDropdown"
      >
        <span class="tw-relative tw-mr-2">
          <font-awesome-icon icon="fa-solid fa-phone fa-stack-2x"/>
          <font-awesome-icon icon="fa-solid fa-right-left"
                             class="tw-absolute tw-top-[-1px] tw-left-[10px] tw-text-xxs"/>
        </span>
        Transfer Call
      </button>

      <div
          v-if="isDropdownOpen"
          class="tw-text-xs tw-mt-1 tw-bg-white tw-shadow-lg tw-rounded-sm tw-border tw-border-gray-200"
      >
        <div class="tw-py-1">
          <!-- List of Transfer Numbers -->
          <button
              v-for="(transferNumber, index) in transferNumbers"
              :key="index"
              :title="`Transfer to ${transferNumber.description}`"
              class="tw-w-full tw-bg-gray-600 hover:tw-bg-gray-900 hover:tw-text-white tw-px-3 tw-py-2 tw-text-left tw-flex tw-flex-col"
              :class="{'tw-mt-1': index !== 0}"
              @click="handleCallTransfer(transferNumber)"
          >
            <p class="tw-font-bold tw-text-white tw-text-xs">
              Call {{ transferNumber.description }}
            </p>
            <span class="tw-text-gray-200 tw-text-xs">{{ transferNumber.phoneNumber }}</span>
          </button>
        </div>
      </div>
    </div>
    <div class="tw-relative tw-inline-block tw-text-left tw-w-full" v-else>
      <div class="tw-flex tw-justify-between tw-gap-1">
        <button
            title="Disconnect Agent"
            class="tw-w-full tw-h-[36px] tw-bg-yellow-600 hover:tw-bg-yellow-700 tw-px-3 tw-py-1.5 tw-text-white tw-font-bold tw-rounded-sm tw-flex tw-items-center tw-justify-center"
            @click="handleDisconnectAgent"
        >
          <font-awesome-icon icon="fa-solid fa-user-slash" class="tw-mr-2"/>
          Disconnect
        </button>
        
        <button
            title="End Transfer"
            class="tw-w-full tw-h-[36px] tw-bg-red-600 hover:tw-bg-red-700 tw-px-3 tw-py-1.5 tw-text-white tw-font-bold tw-rounded-sm tw-flex tw-items-center tw-justify-center"
            @click="handleEndCallTransfer"
        >
          <font-awesome-icon icon="fa-solid fa-phone-slash" class="tw-mr-2"/>
          End Transfer
        </button>
        
        <button
            title="Restore Call"
            class="tw-w-full tw-h-[36px] tw-bg-green-600 hover:tw-bg-green-700 tw-px-3 tw-py-1.5 tw-text-white tw-font-bold tw-rounded-sm tw-flex tw-items-center tw-justify-center"
            @click="handleRestoreCall"
        >
          <font-awesome-icon icon="fa-solid fa-rotate" class="tw-mr-2"/>
          Restore Call
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";
import {library} from "@fortawesome/fontawesome-svg-core";
import {faPhone, faRightLeft, faUserSlash, faPhoneSlash, faRotate} from "@fortawesome/free-solid-svg-icons";

library.add(faPhone, faRightLeft, faUserSlash, faPhoneSlash, faRotate);

export default {
  name: "CallTransferOptions",
  components: {
    FontAwesomeIcon
  },
  props: {
    transferNumbers: {
      type: Array,
      required: true,
      default: () => [],
    },
    transferActive: {
      type: Boolean,
      default: false
    }
  },
  emits: ["transfer-call", "end-transfer-call", "disconnect-agent", "restore-call"],
  data() {
    return {
      isDropdownOpen: false,
    };
  },
  methods: {
    toggleDropdown() {
      this.isDropdownOpen = !this.isDropdownOpen;
    },
    handleCallTransfer(transferNumber) {
      this.$emit("transfer-call", transferNumber);
      this.isDropdownOpen = false;
    },
    handleDisconnectAgent() {
      this.$emit("disconnect-agent", true);
    },
    handleEndCallTransfer() {
      this.$emit("end-transfer-call", true);
    },
    handleRestoreCall() {
      this.$emit("restore-call", true);
    },
  },
};
</script>