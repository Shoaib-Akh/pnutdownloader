// convertISODurationToSeconds.js

export const convertISODurationToSeconds = (duration) => {
    // Handle "m:s.sssss" format (e.g., "2:7.219999999999999")
    if (typeof duration === 'string' && /^\d+:\d+\.\d+$/.test(duration)) {
        const [minutes, secondsWithDecimal] = duration.split(':');
        const seconds = Math.floor(parseFloat(secondsWithDecimal));
        return parseInt(minutes) * 60 + seconds;
    }

    // Handle "m:ss" format (e.g., "3:18")
    if (typeof duration === 'string' && /^\d+:\d+$/.test(duration)) {
        const [minutes, seconds] = duration.split(':');
        return parseInt(minutes) * 60 + parseInt(seconds);
    }

    // Handle ISO 8601 duration string
    if (typeof duration === 'string' && duration.startsWith('PT')) {
        const matches = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        if (!matches) return 0;

        const hours = matches[1] ? parseInt(matches[1]) : 0;
        const minutes = matches[2] ? parseInt(matches[2]) : 0;
        const seconds = matches[3] ? parseInt(matches[3]) : 0;

        return hours * 3600 + minutes * 60 + seconds;
    }

    return duration; // Return as is if format is invalid
};

export const formatTime = (seconds) => {
    // If already in "m:ss" format, return as is
    if (typeof seconds === 'string' && /^\d+:\d+$/.test(seconds)) {
        return seconds;
    }

    if (typeof seconds !== 'number' || isNaN(seconds)) {
        return "0:00"; // Handle invalid cases safely
    }

    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
};