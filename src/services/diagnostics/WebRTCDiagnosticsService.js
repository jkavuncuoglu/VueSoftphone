/**
 * WebRTCDiagnosticsService
 * 
 * This service provides diagnostic tests for WebRTC functionality, including:
 * - Microphone permissions check
 * - Network connectivity test
 * - WebRTC stability test
 * - Speed test
 * 
 * The tests are designed to run during initialization and identify potential issues
 * that could affect call quality or prevent calls from working altogether.
 */

// Default test configuration
const DEFAULT_CONFIG = {
  // How long to wait for each test to complete (in ms)
  timeouts: {
    microphone: 5000,
    connectivity: 5000,
    webrtc: 7000,
    speed: 10000
  },
  // Minimum acceptable values for tests
  thresholds: {
    // Minimum upload speed in Kbps
    uploadSpeed: 100,
    // Minimum download speed in Kbps
    downloadSpeed: 100,
    // Maximum acceptable latency in ms
    maxLatency: 300,
    // Maximum acceptable packet loss percentage
    maxPacketLoss: 5
  },
  // URLs for testing
  urls: {
    // URL for connectivity test
    connectivityTest: 'https://www.google.com',
    // STUN server for WebRTC test
    stunServer: 'stun:stun.l.google.com:19302',
    // URL for speed test
    speedTest: 'https://www.speedtest.net'
  }
};

class WebRTCDiagnosticsService {
  constructor(config = {}) {
    // Merge default config with provided config
    this.config = {
      timeouts: { ...DEFAULT_CONFIG.timeouts, ...config.timeouts },
      thresholds: { ...DEFAULT_CONFIG.thresholds, ...config.thresholds },
      urls: { ...DEFAULT_CONFIG.urls, ...config.urls }
    };
    
    // Store test results
    this.results = {
      microphone: null,
      connectivity: null,
      webrtc: null,
      speed: null
    };
    
    // Flag to track if all tests have passed
    this.allTestsPassed = false;
  }
  
  /**
   * Run all diagnostic tests
   * @returns {Promise<Object>} Results of all tests
   */
  async runAllTests() {
    try {
      // Run tests in parallel
      const [microphoneResult, connectivityResult, webrtcResult, speedResult] = await Promise.all([
        this.checkMicrophonePermissions(),
        this.testNetworkConnectivity(),
        this.testWebRTCStability(),
        this.performSpeedTest()
      ]);
      
      // Store results
      this.results = {
        microphone: microphoneResult,
        connectivity: connectivityResult,
        webrtc: webrtcResult,
        speed: speedResult
      };
      
      // Check if all tests passed
      this.allTestsPassed = 
        microphoneResult.success && 
        connectivityResult.success && 
        webrtcResult.success && 
        speedResult.success;
      
      return this.results;
    } catch (error) {
      console.error('Error running diagnostic tests:', error);
      return {
        error: true,
        message: error.message || 'Unknown error running diagnostic tests'
      };
    }
  }
  
  /**
   * Check if the user has granted microphone permissions
   * @returns {Promise<Object>} Test result
   */
  async checkMicrophonePermissions() {
    try {
      // Create timeout promise
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Microphone permission request timed out')), this.config.timeouts.microphone);
      });
      
      // Create permission request promise
      const permissionRequest = new Promise(async (resolve) => {
        try {
          // Request microphone access
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          
          // Check if we got audio tracks
          if (stream.getAudioTracks().length > 0) {
            // Stop all tracks to clean up
            stream.getTracks().forEach(track => track.stop());
            
            resolve({
              success: true,
              message: 'Microphone permissions granted'
            });
          } else {
            resolve({
              success: false,
              message: 'No audio tracks found',
              solution: 'Check that your microphone is properly connected and not being used by another application.'
            });
          }
        } catch (error) {
          let solution = 'Allow microphone access when prompted by your browser.';
          let message = 'Microphone permission denied';
          
          if (error.name === 'NotFoundError') {
            message = 'No microphone found';
            solution = 'Connect a microphone to your device.';
          } else if (error.name === 'NotAllowedError') {
            solution = 'Go to your browser settings and allow microphone access for this site.';
          } else if (error.name === 'NotReadableError') {
            message = 'Microphone is already in use';
            solution = 'Close other applications that might be using your microphone.';
          }
          
          resolve({
            success: false,
            message,
            solution,
            error: error.name
          });
        }
      });
      
      // Race timeout against permission request
      return await Promise.race([permissionRequest, timeout]);
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Unknown error checking microphone permissions',
        solution: 'Try refreshing the page or check your browser settings.'
      };
    }
  }
  
  /**
   * Test network connectivity
   * @returns {Promise<Object>} Test result
   */
  async testNetworkConnectivity() {
    try {
      // Create timeout promise
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Network connectivity test timed out')), this.config.timeouts.connectivity);
      });
      
      // Create connectivity test promise
      const connectivityTest = new Promise(async (resolve) => {
        try {
          // Use fetch to test connectivity
          const startTime = Date.now();
          const response = await fetch(this.config.urls.connectivityTest, { 
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-cache'
          });
          const endTime = Date.now();
          
          // Calculate latency
          const latency = endTime - startTime;
          
          // Check if latency is acceptable
          const isLatencyAcceptable = latency < this.config.thresholds.maxLatency;
          
          resolve({
            success: isLatencyAcceptable,
            message: isLatencyAcceptable ? 'Network connectivity is good' : 'Network latency is too high',
            latency,
            solution: isLatencyAcceptable ? null : 'Check your internet connection or try connecting to a different network.'
          });
        } catch (error) {
          resolve({
            success: false,
            message: 'Network connectivity test failed',
            solution: 'Check your internet connection or firewall settings.',
            error: error.message
          });
        }
      });
      
      // Race timeout against connectivity test
      return await Promise.race([connectivityTest, timeout]);
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Unknown error testing network connectivity',
        solution: 'Check your internet connection or try again later.'
      };
    }
  }
  
  /**
   * Test WebRTC stability by creating a connection to a STUN server
   * @returns {Promise<Object>} Test result
   */
  async testWebRTCStability() {
    try {
      // Check if WebRTC is supported
      if (!window.RTCPeerConnection) {
        return {
          success: false,
          message: 'WebRTC is not supported in this browser',
          solution: 'Try using a modern browser like Chrome, Firefox, or Edge.'
        };
      }
      
      // Create timeout promise
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('WebRTC stability test timed out')), this.config.timeouts.webrtc);
      });
      
      // Create WebRTC test promise
      const webrtcTest = new Promise(async (resolve) => {
        try {
          // Create RTCPeerConnection
          const pc = new RTCPeerConnection({
            iceServers: [{ urls: this.config.urls.stunServer }]
          });
          
          // Variables to track ICE gathering
          let iceCandidates = [];
          let iceGatheringComplete = false;
          
          // Listen for ICE candidates
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              iceCandidates.push(event.candidate);
            } else {
              // ICE gathering is complete
              iceGatheringComplete = true;
              
              // Check if we have any candidates
              if (iceCandidates.length === 0) {
                resolve({
                  success: false,
                  message: 'No ICE candidates found',
                  solution: 'Check your firewall settings or try a different network.'
                });
                return;
              }
              
              // Check if we have any non-host candidates (i.e., STUN/TURN)
              const hasNonHostCandidates = iceCandidates.some(
                candidate => candidate.candidate.indexOf('typ host') === -1
              );
              
              if (!hasNonHostCandidates) {
                resolve({
                  success: false,
                  message: 'Only local network candidates found',
                  solution: 'Your network may be blocking WebRTC traffic. Check firewall settings or contact your network administrator.'
                });
                return;
              }
              
              // If we got here, WebRTC is working
              resolve({
                success: true,
                message: 'WebRTC is working properly',
                candidateCount: iceCandidates.length
              });
              
              // Clean up
              pc.close();
            }
          };
          
          // Create data channel to trigger ICE gathering
          pc.createDataChannel('test');
          
          // Create offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          // Set a timeout for ICE gathering
          setTimeout(() => {
            if (!iceGatheringComplete) {
              resolve({
                success: false,
                message: 'ICE gathering timed out',
                solution: 'Your network may be slow or blocking WebRTC traffic. Try a different network.'
              });
              
              // Clean up
              pc.close();
            }
          }, this.config.timeouts.webrtc - 1000);
        } catch (error) {
          resolve({
            success: false,
            message: 'WebRTC test failed',
            solution: 'Your browser may have WebRTC disabled or blocked. Check browser settings.',
            error: error.message
          });
        }
      });
      
      // Race timeout against WebRTC test
      return await Promise.race([webrtcTest, timeout]);
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Unknown error testing WebRTC stability',
        solution: 'Try using a different browser or network connection.'
      };
    }
  }
  
  /**
   * Perform a speed test to measure upload and download speeds
   * @returns {Promise<Object>} Test result
   */
  async performSpeedTest() {
    try {
      // Create timeout promise
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Speed test timed out')), this.config.timeouts.speed);
      });
      
      // Create speed test promise
      const speedTest = new Promise(async (resolve) => {
        try {
          // Simulate a speed test
          // In a real implementation, you would use a proper speed test library or API
          
          // Simulate download test
          const downloadSpeed = await this.simulateDownloadTest();
          
          // Simulate upload test
          const uploadSpeed = await this.simulateUploadTest();
          
          // Check if speeds meet thresholds
          const isDownloadAcceptable = downloadSpeed >= this.config.thresholds.downloadSpeed;
          const isUploadAcceptable = uploadSpeed >= this.config.thresholds.uploadSpeed;
          const isSpeedAcceptable = isDownloadAcceptable && isUploadAcceptable;
          
          resolve({
            success: isSpeedAcceptable,
            message: isSpeedAcceptable ? 'Network speed is acceptable' : 'Network speed is too slow',
            downloadSpeed,
            uploadSpeed,
            solution: isSpeedAcceptable ? null : 'Your internet connection may be too slow for reliable calls. Try a different network or close bandwidth-intensive applications.'
          });
        } catch (error) {
          resolve({
            success: false,
            message: 'Speed test failed',
            solution: 'Check your internet connection or try again later.',
            error: error.message
          });
        }
      });
      
      // Race timeout against speed test
      return await Promise.race([speedTest, timeout]);
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Unknown error performing speed test',
        solution: 'Check your internet connection or try again later.'
      };
    }
  }
  
  /**
   * Simulate a download speed test
   * @returns {Promise<number>} Download speed in Kbps
   * @private
   */
  async simulateDownloadTest() {
    return new Promise((resolve) => {
      // In a real implementation, you would download a file and measure the speed
      // For this simulation, we'll generate a random speed between 50 and 500 Kbps
      setTimeout(() => {
        const speed = Math.floor(Math.random() * 450) + 50;
        resolve(speed);
      }, 1000);
    });
  }
  
  /**
   * Simulate an upload speed test
   * @returns {Promise<number>} Upload speed in Kbps
   * @private
   */
  async simulateUploadTest() {
    return new Promise((resolve) => {
      // In a real implementation, you would upload a file and measure the speed
      // For this simulation, we'll generate a random speed between 50 and 500 Kbps
      setTimeout(() => {
        const speed = Math.floor(Math.random() * 450) + 50;
        resolve(speed);
      }, 1000);
    });
  }
  
  /**
   * Get the results of all tests
   * @returns {Object} Test results
   */
  getResults() {
    return this.results;
  }
  
  /**
   * Check if all tests passed
   * @returns {boolean} True if all tests passed
   */
  didAllTestsPass() {
    return this.allTestsPassed;
  }
  
  /**
   * Get a summary of test results
   * @returns {Object} Summary of test results
   */
  getSummary() {
    const failedTests = [];
    
    // Check each test
    if (this.results.microphone && !this.results.microphone.success) {
      failedTests.push({
        test: 'Microphone',
        message: this.results.microphone.message,
        solution: this.results.microphone.solution
      });
    }
    
    if (this.results.connectivity && !this.results.connectivity.success) {
      failedTests.push({
        test: 'Network Connectivity',
        message: this.results.connectivity.message,
        solution: this.results.connectivity.solution
      });
    }
    
    if (this.results.webrtc && !this.results.webrtc.success) {
      failedTests.push({
        test: 'WebRTC Stability',
        message: this.results.webrtc.message,
        solution: this.results.webrtc.solution
      });
    }
    
    if (this.results.speed && !this.results.speed.success) {
      failedTests.push({
        test: 'Network Speed',
        message: this.results.speed.message,
        solution: this.results.speed.solution
      });
    }
    
    return {
      allPassed: this.allTestsPassed,
      failedTests
    };
  }
}

export default WebRTCDiagnosticsService;