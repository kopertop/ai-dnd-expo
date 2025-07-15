import '@testing-library/jest-dom'

// Mock React Native modules that don't work in test environment
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native')
  
  RN.NativeModules = {
    ...RN.NativeModules,
    ExpoSpeech: {
      speak: jest.fn(),
      stop: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      isSpeaking: jest.fn().mockResolvedValue(false),
    },
    ExpoSpeechRecognition: {
      requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
      getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
      getSupportedLocales: jest.fn().mockResolvedValue(['en-US']),
      start: jest.fn(),
      stop: jest.fn(),
      abort: jest.fn(),
    },
  }
  
  return RN
})

// Mock Expo modules
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  isSpeaking: jest.fn().mockResolvedValue(false),
}))

jest.mock('expo-speech-recognition', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  getSupportedLocales: jest.fn().mockResolvedValue(['en-US']),
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
}))

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  usePathname: () => '/',
}))

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}))