<template>
  <div class="tw-flex tw-w-full tw-gap-1">
    <!-- Place Call Buttons -->
    <div class="tw-w-full">
      <button
          v-if="dialing"
          title="Cancel Call"
          class="tw-w-full tw-bg-red-600 hover:tw-bg-red-700 tw-text-white tw-font-bold tw-py-2 tw-px-4 tw-rounded-sm tw-flex tw-items-center tw-justify-center tw-transition-colors"
          @click="cancelCall"
      >
        <font-awesome-icon icon="fa-solid fa-phone-slash" class="tw-mr-2"/>
        Cancel Call
      </button>
      <div v-else>
        <!-- Show first 2 phone numbers directly -->
        <button
            v-for="(phoneNumber, index) of phoneNumbers.slice(0, 2)"
            :key="index"
            :title="`Call ${phoneNumber.phoneNumber}`"
            class="tw-w-full tw-mt-1 tw-bg-blue-600 hover:tw-bg-blue-700 tw-text-white tw-font-bold tw-py-2 tw-px-4 tw-rounded-sm tw-flex tw-flex-col tw-items-start tw-transition-colors"
            @click="placeCall(phoneNumber.phoneNumber)"
        >
          <p class="tw-font-bold tw-text-white tw-flex tw-items-center">
            <font-awesome-icon icon="fa-solid fa-phone" class="tw-mr-2"/> 
            Call {{phoneNumber.phoneNumber}}
          </p>
          <span class="tw-text-gray-200 tw-text-xs">{{phoneNumber.description}}</span>
        </button>
        
        <!-- Show "More Numbers" button if there are more than 2 phone numbers -->
        <button
            v-if="phoneNumbers.length > 2"
            class="tw-w-full tw-mt-2 tw-bg-gray-500 hover:tw-bg-gray-600 tw-text-white tw-font-bold tw-py-2 tw-px-4 tw-rounded-sm tw-flex tw-items-center tw-justify-center tw-transition-colors"
            @click="showAdditionalPhoneNumbers"
        >
          <font-awesome-icon icon="fa-solid fa-list" class="tw-mr-2"/>
          Show More Numbers ({{phoneNumbers.length - 2}})
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import { faPhone, faPhoneSlash, faList } from "@fortawesome/free-solid-svg-icons";

library.add(faPhone, faPhoneSlash, faList)

export default {
  name: "OutgoingCallActions",
  components: {
    FontAwesomeIcon
  },
  props: {
    phoneNumbers: {
      type: Array,
      required: true,
    },
    initialDialingState: {
      type: Boolean,
      default: false
    }
  },
  emits: ["placeCall", "cancelCall", "dialingStateChanged", "showAdditionalPhoneNumbers"],
  data() {
    return {
      dialing: this.initialDialingState,
    }
  },
  watch: {
    initialDialingState(newValue) {
      this.dialing = newValue;
    }
  },
  methods: {
    placeCall(phoneNumber) {
      this.setDialingState(true);
      this.$emit("placeCall", phoneNumber);
    },
    cancelCall() {
      this.setDialingState(false);
      this.$emit("cancelCall");
    },
    setDialingState(state) {
      this.dialing = state;
      this.$emit("dialingStateChanged", state);
    },
    showAdditionalPhoneNumbers() {
      this.$emit("showAdditionalPhoneNumbers");
    }
  },
};
</script>