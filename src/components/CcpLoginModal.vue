<template>
  <div v-if="visible" class="tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-50 tw-flex tw-items-center tw-justify-center tw-z-50">
    <div class="tw-bg-white tw-rounded-md tw-shadow-lg tw-max-w-md tw-w-full tw-mx-4">
      <div class="tw-flex tw-justify-between tw-items-center tw-border-b tw-border-gray-200 tw-p-4">
        <h3 class="tw-text-lg tw-font-medium tw-text-gray-900">{{ modalTitle }}</h3>
      </div>
      
      <div class="tw-p-6">
        <div class="tw-text-center tw-mb-6">
          <font-awesome-icon icon="fa-solid fa-headset" :class="iconClass" class="tw-text-4xl tw-mb-2" />
          <p class="tw-text-gray-700">
            {{ loginMessage }}
          </p>
        </div>
        
        <div class="tw-bg-yellow-50 tw-border-l-4 tw-border-yellow-400 tw-p-4 tw-mb-6">
          <div class="tw-flex">
            <div class="tw-flex-shrink-0">
              <font-awesome-icon icon="fa-solid fa-exclamation-triangle" class="tw-text-yellow-400" />
            </div>
            <div class="tw-ml-3">
              <p class="tw-text-sm tw-text-yellow-700">
                A new window will open for you to log in. Please make sure your browser allows pop-ups for this site.
              </p>
            </div>
          </div>
        </div>
        
        <div class="tw-flex tw-justify-center">
          <button
            @click="login"
            :class="buttonClass"
            class="tw-text-white tw-font-bold tw-py-2 tw-px-6 tw-rounded-sm tw-transition-colors"
          >
            <font-awesome-icon icon="fa-solid fa-sign-in-alt" class="tw-mr-2" />
            Log In
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import { faHeadset, faExclamationTriangle, faSignInAlt } from "@fortawesome/free-solid-svg-icons";

library.add(faHeadset, faExclamationTriangle, faSignInAlt);

/**
 * CcpLoginModal Component
 * 
 * This component displays a login modal for different softphone providers.
 * It adapts its appearance and content based on the provider prop.
 * 
 * To add support for a new provider:
 * 1. Add a new case in each computed property (modalTitle, loginMessage, iconClass, buttonClass)
 * 2. Provide appropriate values for the new provider
 * 3. Pass the provider name from Softphone.vue
 * 
 * The component will automatically handle the new provider with the specified styling and content.
 */
export default {
  name: "CcpLoginModal",
  components: {
    FontAwesomeIcon
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    provider: {
      type: String,
      default: 'amazon-connect'
    }
  },
  emits: ["login"],
  computed: {
    /**
     * Returns the appropriate modal title based on the provider
     * @returns {string} The modal title
     */
    modalTitle() {
      switch (this.provider) {
        case 'amazon-connect':
          return 'Amazon Connect Login';
        case 'twilio':
          return 'Twilio Login';
        default:
          return 'Softphone Login';
      }
    },
    
    /**
     * Returns the appropriate login message based on the provider
     * @returns {string} The login message
     */
    loginMessage() {
      switch (this.provider) {
        case 'amazon-connect':
          return 'You need to log in to Amazon Connect to use the softphone.';
        case 'twilio':
          return 'You need to log in to Twilio to use the softphone.';
        default:
          return 'You need to log in to use the softphone.';
      }
    },
    
    /**
     * Returns the appropriate icon class based on the provider
     * @returns {string} The icon class
     */
    iconClass() {
      switch (this.provider) {
        case 'amazon-connect':
          return 'tw-text-blue-600';
        case 'twilio':
          return 'tw-text-red-600';
        default:
          return 'tw-text-gray-600';
      }
    },
    
    /**
     * Returns the appropriate button class based on the provider
     * @returns {string} The button class
     */
    buttonClass() {
      switch (this.provider) {
        case 'amazon-connect':
          return 'tw-bg-blue-600 hover:tw-bg-blue-700';
        case 'twilio':
          return 'tw-bg-red-600 hover:tw-bg-red-700';
        default:
          return 'tw-bg-gray-600 hover:tw-bg-gray-700';
      }
    }
  },
  methods: {
    /**
     * Emits the login event to the parent component
     */
    login() {
      this.$emit("login");
    }
  }
};
</script>