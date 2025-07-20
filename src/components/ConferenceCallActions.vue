<template>
  <div class="tw-w-full">
    <div class="tw-relative tw-inline-block tw-text-left tw-w-full" v-if="!conferenceActive">
      <button
          title="Start Conference"
          class="tw-w-full tw-h-[36px] tw-bg-blue-600 hover:tw-bg-blue-700 tw-px-3 tw-py-1.5 tw-text-md tw-rounded-sm tw-transition-all tw-duration-300 tw-ease-in-out tw-text-white tw-flex tw-items-center tw-justify-center"
          :disabled="!phoneNumbers.length"
          @click="toggleDropdown"
      >
        <span class="tw-relative tw-mr-2">
          <font-awesome-icon icon="fa-solid fa-users"/>
        </span>
        Start Conference
      </button>

      <div
          v-if="isDropdownOpen"
          class="tw-text-xs tw-mt-1 tw-bg-white tw-shadow-lg tw-rounded-sm tw-border tw-border-gray-200"
      >
        <div class="tw-py-1">
          <!-- List of Phone Numbers -->
          <button
              v-for="(phoneNumber, index) in phoneNumbers"
              :key="index"
              :title="`Add ${phoneNumber.description} to conference`"
              class="tw-w-full tw-bg-gray-600 hover:tw-bg-gray-900 hover:tw-text-white tw-px-3 tw-py-2 tw-text-left tw-flex tw-flex-col"
              :class="{'tw-mt-1': index !== 0}"
              @click="handleInitiateConference(phoneNumber)"
          >
            <p class="tw-font-bold tw-text-white tw-text-xs">
              Add {{ phoneNumber.description }}
            </p>
            <span class="tw-text-gray-200 tw-text-xs">{{ phoneNumber.phoneNumber }}</span>
          </button>
        </div>
      </div>
    </div>
    <div class="tw-relative tw-inline-block tw-text-left tw-w-full" v-else>
      <div class="tw-bg-gray-100 tw-p-2 tw-rounded-sm tw-mb-2">
        <h3 class="tw-text-sm tw-font-bold tw-mb-1">Conference Participants</h3>
        <ul class="tw-text-xs">
          <li v-for="(participant, index) in participants" :key="index" class="tw-flex tw-justify-between tw-items-center tw-mb-1">
            <div>
              <span class="tw-font-medium">{{ participant.description || participant.phoneNumber }}</span>
              <span class="tw-text-gray-500 tw-ml-1">({{ participant.status }})</span>
            </div>
            <button
                v-if="participant.status !== 'customer'"
                title="Remove from conference"
                class="tw-bg-red-600 hover:tw-bg-red-700 tw-text-white tw-px-2 tw-py-1 tw-rounded-sm tw-text-xs"
                @click="handleRemoveFromConference(participant)"
            >
              <font-awesome-icon icon="fa-solid fa-user-minus" />
            </button>
          </li>
        </ul>
      </div>
      
      <div class="tw-flex tw-justify-between tw-gap-1">
        <button
            title="Merge All Calls"
            class="tw-w-full tw-h-[36px] tw-bg-green-600 hover:tw-bg-green-700 tw-px-3 tw-py-1.5 tw-text-white tw-font-bold tw-rounded-sm tw-flex tw-items-center tw-justify-center"
            @click="handleMergeConnections"
            :disabled="participants.length < 3"
        >
          <font-awesome-icon icon="fa-solid fa-object-group" class="tw-mr-2"/>
          Merge Calls
        </button>
        
        <button
            title="End Conference"
            class="tw-w-full tw-h-[36px] tw-bg-red-600 hover:tw-bg-red-700 tw-px-3 tw-py-1.5 tw-text-white tw-font-bold tw-rounded-sm tw-flex tw-items-center tw-justify-center"
            @click="handleEndConference"
        >
          <font-awesome-icon icon="fa-solid fa-phone-slash" class="tw-mr-2"/>
          End Conference
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";
import {library} from "@fortawesome/fontawesome-svg-core";
import {faUsers, faUserMinus, faObjectGroup, faPhoneSlash} from "@fortawesome/free-solid-svg-icons";

library.add(faUsers, faUserMinus, faObjectGroup, faPhoneSlash);

export default {
  name: "ConferenceCallsComponent",
  components: {
    FontAwesomeIcon
  },
  props: {
    phoneNumbers: {
      type: Array,
      required: true,
      default: () => [],
    },
    conferenceActive: {
      type: Boolean,
      default: false
    },
    participants: {
      type: Array,
      default: () => []
    }
  },
  emits: [
    "initiate-conference", 
    "merge-connections", 
    "remove-from-conference", 
    "end-conference"
  ],
  data() {
    return {
      isDropdownOpen: false,
    };
  },
  methods: {
    toggleDropdown() {
      this.isDropdownOpen = !this.isDropdownOpen;
    },
    handleInitiateConference(phoneNumber) {
      this.$emit("initiate-conference", phoneNumber);
      this.isDropdownOpen = false;
    },
    handleMergeConnections() {
      this.$emit("merge-connections", true);
    },
    handleRemoveFromConference(participant) {
      this.$emit("remove-from-conference", participant);
    },
    handleEndConference() {
      this.$emit("end-conference", true);
    }
  },
};
</script>