<template>
  <div v-if="visible" class="tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-50 tw-flex tw-items-center tw-justify-center tw-z-50">
    <div class="tw-bg-white tw-rounded-md tw-shadow-lg tw-max-w-md tw-w-full tw-mx-4">
      <div class="tw-flex tw-justify-between tw-items-center tw-border-b tw-border-gray-200 tw-p-4">
        <h3 class="tw-text-lg tw-font-medium tw-text-gray-900">Additional Phone Numbers</h3>
        <button 
          @click="closeModal" 
          class="tw-text-gray-400 hover:tw-text-gray-500 focus:tw-outline-none"
        >
          <font-awesome-icon icon="fa-solid fa-times" />
        </button>
      </div>
      
      <div class="tw-p-4 tw-max-h-96 tw-overflow-y-auto">
        <div v-if="phoneNumbers.length === 0" class="tw-text-center tw-py-4 tw-text-gray-500">
          No phone numbers available
        </div>
        
        <div v-else>
          <button
            v-for="(phoneNumber, index) in phoneNumbers"
            :key="index"
            class="tw-w-full tw-mt-2 tw-bg-blue-600 hover:tw-bg-blue-700 tw-text-white tw-font-bold tw-py-2 tw-px-4 tw-rounded-sm tw-flex tw-flex-col tw-items-start tw-transition-colors"
            @click="callNumber(phoneNumber)"
          >
            <p class="tw-font-bold tw-text-white tw-flex tw-items-center">
              <font-awesome-icon icon="fa-solid fa-phone" class="tw-mr-2"/> 
              Call {{phoneNumber.phoneNumber}}
            </p>
            <span class="tw-text-gray-200 tw-text-xs">{{phoneNumber.description}}</span>
          </button>
        </div>
      </div>
      
      <div class="tw-bg-gray-50 tw-px-4 tw-py-3 tw-flex tw-justify-end tw-border-t tw-border-gray-200">
        <button
          @click="closeModal"
          class="tw-bg-gray-500 hover:tw-bg-gray-600 tw-text-white tw-font-bold tw-py-2 tw-px-4 tw-rounded-sm tw-transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import { faPhone, faTimes } from "@fortawesome/free-solid-svg-icons";

library.add(faPhone, faTimes);

export default {
  name: "AdditionalNumbersModal",
  components: {
    FontAwesomeIcon
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    phoneNumbers: {
      type: Array,
      default: () => []
    }
  },
  emits: ["call", "close"],
  methods: {
    callNumber(phoneNumber) {
      this.$emit("call", phoneNumber.phoneNumber);
    },
    closeModal() {
      this.$emit("close");
    }
  }
};
</script>