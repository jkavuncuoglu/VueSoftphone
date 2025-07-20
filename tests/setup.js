import Vue from 'vue'
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'

library.add(faSpinner)
Vue.component('font-awesome-icon', FontAwesomeIcon)

// Mock window.open
window.open = jest.fn()

// Mock environment variables
process.env.MIX_AWS_CONNECT_URL = 'test-connect-url'