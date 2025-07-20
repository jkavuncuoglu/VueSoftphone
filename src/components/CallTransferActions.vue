<template>
  <div class="tw-w-full">
    <div class="tw-relative tw-inline-block tw-text-left tw-w-full" v-if="!transferActive">
      <lift-button
          title="Transfer Call"
          label="Transfer Call"
          color="primary"
          rounded="small"
          class="tw-w-full tw-h-[36px] tw-bg-pleio-primary hover:tw-bg-pleio-pear-light tw-px-3 tw-py-1.5 tw-text-md tw-rounded-sm tw-transition-all tw-duration-300 tw-ease-in-out tw-text-white "
          :disabled="!transferNumbers.length"
          @click="toggleDropdown"
      >
        <template #icon>
        <span class="tw-relative tw-mr-2">
          <font-awesome-icon icon="fa-solid fa-phone fa-stack-2x"/>
          <font-awesome-icon icon="fa-solid fa-right-left"
                             class="tw-absolute tw-top-[-1px] tw-left-[10px] tw-text-xxs"/>
        </span>
        </template>
      </lift-button>

      <div
          v-if="isDropdownOpen"
          class="tw-text-xs"
      >
        <div class="py-1">
          <!-- List of Transfer Numbers -->
          <lift-button
              v-for="(transferNumber, index) in transferNumbers"
              :key="index"
              :title="`Transfer to ${transferNumber.description}`"
              rounded="small"
              class="tw-w-full tw-bg-gray-600 hover:tw-bg-gray-900 hover:tw-text-white"
              :class="{'tw-mt-1': index !== 0}"
              @click="handleCallTransfer(transferNumber)"
          >
            <template #body>
              <p class="tw-font-bold tw-text-white tw-text-xs">
                Call {{ transferNumber.description }}
              </p>
              <span class="tw-text-gray-200 tw-text-xs">{{ transferNumber.phoneNumber }}</span>
            </template>
          </lift-button>
        </div>
      </div>
    </div>
    <div class="tw-relative tw-inline-block tw-text-left tw-w-full" v-else>
      <div class="tw-flex tw-justify-between tw-gap-1">
        <lift-button
            title="Disconnect Agent"
            label="Disconnect"
            color="warning"
            rounded="small"
            class="tw-w-full tw-h-[36px]"
            @click="handleDisconnectAgent"
        >
          <template #icon>
            <font-awesome-icon icon="fa-solid fa-user-slash"/>
          </template>
        </lift-button>
      </div>
    </div>
  </div>
</template>

<script>
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";
import {library} from "@fortawesome/fontawesome-svg-core";
import {faPhone, faRightLeft, faUserSlash} from "@fortawesome/free-solid-svg-icons";

library.add(faPhone, faRightLeft, faUserSlash);

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
  emits: ["transfer-call", "end-transfer-call", "disconnect-agent"],
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
  },
};
</script>