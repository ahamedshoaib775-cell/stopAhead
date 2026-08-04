// i18n.js - Multi-language translation system (English & Tamil)
const TRANSLATIONS = {
  en: {
    // General & Nav
    appName: 'StopAhead',
    tagline: 'Never Miss Your Stop',
    home: 'Home',
    setDestination: 'Set Destination',
    activeTrip: 'Active Trip',
    settings: 'Settings',
    confirm: 'Confirm',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    close: 'Close',
    back: 'Back',

    // Hero & Home
    heroTitle: 'Never miss\nyour stop.',
    heroSubtitle: 'Sleep, read, or listen to music. We’ll wake you before arrival.',
    setYourStop: 'Set Your Stop',
    fullscreenMap: 'Full-Screen Navigation Map',
    fullscreenMapDesc: 'Tap to launch OpenStreetMap full-screen live tracking',
    savedRoutes: 'My Saved Favorite Routes',
    noSavedRoutes: 'No saved routes yet. Search any destination and tap ⭐ Save to My Routes to bookmark your daily commutes here.',
    recentHistory: 'Recent Trip History',
    smartCommuteSuggest: 'Smart Commute Suggestion',
    startCommuteNow: 'Start This Commute',

    // How are you traveling?
    howTraveling: 'How are you traveling?',
    bus: 'Bus',
    busDesc: 'City & Suburban Bus Stops',
    train: 'Train',
    trainDesc: 'Intercity Mainline Railway',
    metro: 'Metro',
    metroDesc: 'Subway & Underground Rail',
    localTrain: 'Local Train',
    localTrainDesc: 'Suburban Commuter Rail',

    // Destination setup
    routeMapPreview: 'Route Map Preview',
    destinationStop: 'Destination Stop',
    searchPlaceholder: 'Search destination or stop...',
    nearbyStops: 'NEARBY STOPS',
    findingStops: 'Finding nearby stops...',
    noNearbyStops: 'No nearby stops found in immediate 2 km area',
    noNearbySub: 'No transit stops were detected near your location within 2 km. Tap below to expand radius or search by station name.',
    expandRadius: 'Expand Search Radius (10 km)',
    selectedDestination: 'Selected Destination Stop',
    saveRoute: 'Save Route',
    alertLeadTime: 'Alert Lead Time',
    stopsMode: 'Stops Mode',
    minutesMode: 'Minutes Mode',
    notifyMe: 'Notify me:',
    stopsBefore: 'stops before',
    stopBefore: 'stop before',
    minutesBefore: 'minutes before',
    minuteBefore: 'minute before',
    confirmStart: 'Confirm & Start Live Tracking',

    // Active Trip
    approachingTitle: 'Approaching Your Destination',
    dismissAlarm: 'Dismiss Alarm',
    destinationStation: 'Destination Station',
    stopsRemaining: 'STOPS REMAINING',
    estArrival: 'EST. ARRIVAL',
    commuteProgress: 'Commute Progress',
    remaining: 'remaining',
    liveRouteTracker: 'Live Route Tracker',
    tapFullscreen: 'Tap for Full-Screen Navigation',
    snoozeMinutes: 'Snooze 5 Mins',
    endTrip: 'End Trip',

    // Safety & Community Buttons
    sos: 'Emergency SOS',
    shareTrip: 'Share Trip',
    reportDelay: 'Report Delay',
    flagStop: 'Flag Stop',

    // Settings
    settingsTitle: 'Settings & Preferences',
    appTheme: 'APPEARANCE & ACCESSIBILITY',
    language: 'Language / மொழி',
    voiceAlerts: 'Voice Spoken Announcements',
    voiceAlertsDesc: 'Announce approaching stop names using Web Speech API',
    highContrast: 'High Contrast Mode',
    fontScale: 'Text Size Scale',
    emergencyContact: 'EMERGENCY CONTACT (SOS)',
    contactName: 'Contact Name',
    contactPhone: 'Phone / WhatsApp Number',
    saveContact: 'Save Emergency Contact',

    // Check-in Modal
    areYouOkay: 'Are You Okay?',
    checkInDesc: 'Your trip has been stationary past the expected arrival time. Do you need assistance or SOS dispatch?',
    imSafe: 'I’m Safe, Continue',
    triggerSosNow: 'Trigger SOS Alert'
  },

  ta: {
    // General & Nav
    appName: 'ஸ்டாப்அஹெட்',
    tagline: 'உங்கள் நிறுத்தத்தை தவறவிடாதீர்கள்',
    home: 'முகப்பு',
    setDestination: 'இலக்கை அமை',
    activeTrip: 'செயலில் உள்ள பயணம்',
    settings: 'அமைப்புகள்',
    confirm: 'உறுதிசெய்',
    cancel: 'ரத்துசெய்',
    save: 'சேமி',
    delete: 'நீக்கு',
    close: 'மூடு',
    back: 'பின்செல்',

    // Hero & Home
    heroTitle: 'உங்கள் நிறுத்தத்தை\nதவறவிடாதீர்கள்.',
    heroSubtitle: 'தூங்குங்கள், படியுங்கள் அல்லது இசை கேளுங்கள். வருகைக்கு முன் நாங்கள் உங்களை எழுப்புவோம்.',
    setYourStop: 'உங்கள் நிறுத்தத்தை அமை',
    fullscreenMap: 'முழுத்திரை வரைபடம்',
    fullscreenMapDesc: 'முழுத்திரை வரைபடத்தை திறக்க தட்டவும்',
    savedRoutes: 'எனது சேமிக்கப்பட்ட பாதைகள்',
    noSavedRoutes: 'இன்னும் சேமிக்கப்பட்ட பாதைகள் இல்லை. உங்கள் தினசரி பயணங்களைச் சேமிக்க ⭐ பொத்தானைத் தட்டவும்.',
    recentHistory: 'சமீபத்திய பயண வரலாறு',
    smartCommuteSuggest: 'ஸ்மார்ட் பயண பரிந்துரை',
    startCommuteNow: 'இந்த பயணத்தைத் தொடங்கு',

    // How are you traveling?
    howTraveling: 'நீங்கள் எப்படி பயணிக்கிறீர்கள்?',
    bus: 'பேருந்து',
    busDesc: 'நகர மற்றும் புறநகர் பேருந்து நிறுத்தங்கள்',
    train: 'ரயில்',
    trainDesc: 'மாவட்டங்களுக்கு இடையிலான ரயில்',
    metro: 'மெட்ரோ',
    metroDesc: 'மெட்ரோ மற்றும் சுரங்கப்பாதை ரயில்',
    localTrain: 'உள்ளூர் ரயில்',
    localTrainDesc: 'புறநகர் மின்சார ரயில்',

    // Destination setup
    routeMapPreview: 'பயண வரைபட முன்னோட்டம்',
    destinationStop: 'இலக்கு நிறுத்தம்',
    searchPlaceholder: 'இலக்கு அல்லது நிறுத்தத்தை தேடுக...',
    nearbyStops: 'அருகிலுள்ள நிறுத்தங்கள்',
    findingStops: 'அருகிலுள்ள நிறுத்தங்களைத் தேடுகிறது...',
    noNearbyStops: '2 கி.மீ சுற்றளவில் நிறுத்தங்கள் எதுவும் இல்லை',
    noNearbySub: 'உங்கள் இருப்பிடத்திற்கு அருகில் நிறுத்தங்கள் எதுவும் கண்டறியப்படவில்லை. ஆரம் அதிகரிக்க கீழே தட்டவும்.',
    expandRadius: 'தேடல் ஆரத்தை அதிகரி (10 கி.மீ)',
    selectedDestination: 'தேர்ந்தெடுக்கப்பட்ட இலக்கு நிறுத்தம்',
    saveRoute: 'பாதையை சேமி',
    alertLeadTime: 'எச்சரிக்கை நேரம்',
    stopsMode: 'நிறுத்தங்கள் முறை',
    minutesMode: 'நிமிடங்கள் முறை',
    notifyMe: 'எனக்கு அறிவி:',
    stopsBefore: 'நிறுத்தங்களுக்கு முன்',
    stopBefore: 'நிறுத்தத்திற்கு முன்',
    minutesBefore: 'நிமிடங்களுக்கு முன்',
    minuteBefore: 'நிமிடத்திற்கு முன்',
    confirmStart: 'உறுதிசெய்து கண்காணிப்பைத் தொடங்கு',

    // Active Trip
    approachingTitle: 'உங்கள் இலக்கு அருகில் உள்ளது',
    dismissAlarm: 'எச்சரிக்கையை நிறுத்து',
    destinationStation: 'இலக்கு நிலையம்',
    stopsRemaining: 'மீதமுள்ள நிறுத்தங்கள்',
    estArrival: 'எதிர்பார்க்கப்படும் நேரம்',
    commuteProgress: 'பயண முன்னேற்றம்',
    remaining: 'மீதமுள்ளது',
    liveRouteTracker: 'நேரலை பாதை கண்காணிப்பு',
    tapFullscreen: 'முழுத்திரைக்கு தட்டவும்',
    snoozeMinutes: '5 நிமிடங்கள் ஒத்திவை',
    endTrip: 'பயணத்தை முடி',

    // Safety & Community Buttons
    sos: 'அவசர SOS',
    shareTrip: 'பயணத்தைப் பகிர்',
    reportDelay: 'தாமதத்தைப் பதிவுசெய்',
    flagStop: 'நிறுத்தத்தைப் புகாரளி',

    // Settings
    settingsTitle: 'அமைப்புகள் & விருப்பங்கள்',
    appTheme: 'தோற்றம் & அணுகல்தன்மை',
    language: 'மொழி / Language',
    voiceAlerts: 'குரல் வழி அறிவிப்புகள்',
    voiceAlertsDesc: 'அருகிலுள்ள நிறுத்தங்களின் பெயர்களை குரல் வழியில் அறிவிக்கும்',
    highContrast: 'உயர் மாறுபாடு முறை',
    fontScale: 'எழுத்து அளவு',
    emergencyContact: 'அவசர தொடர்பு நபர் (SOS)',
    contactName: 'தொடர்பு பெயர்',
    contactPhone: 'தொலைபேசி / வாட்ஸ்அப் எண்',
    saveContact: 'அவசர தொடர்பைச் சேமி',

    // Check-in Modal
    areYouOkay: 'நீங்கள் நலமாக இருக்கிறீர்களா?',
    checkInDesc: 'உங்கள் பயணம் எதிர்பார்த்த நேரத்திற்கு மேல் நகராமல் உள்ளது. உதவி அல்லது SOS அறிவிப்பு தேவையா?',
    imSafe: 'நான் பாதுகாப்பாக இருக்கிறேன்',
    triggerSosNow: 'அவசர SOS ஐ இயக்கு'
  }
};

export function getLanguage() {
  return localStorage.getItem('stopahead_lang') || 'en';
}

export function setLanguage(lang) {
  if (lang === 'en' || lang === 'ta') {
    localStorage.setItem('stopahead_lang', lang);
  }
}

export function t(key, lang = getLanguage()) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS['en'];
  return dict[key] || TRANSLATIONS['en'][key] || key;
}
