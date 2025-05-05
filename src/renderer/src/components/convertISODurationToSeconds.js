// Existing functions (unchanged)
export const convertISODurationToSeconds = (duration) => {
    // Handle "h:m:s.sssss" format (e.g., "1:2:7.219999999999999")
    if (typeof duration === 'string' && /^\d+:\d+:\d+\.\d+$/.test(duration)) {
        const [hours, minutes, secondsWithDecimal] = duration.split(':');
        const seconds = Math.floor(parseFloat(secondsWithDecimal));
        return parseInt(hours) * 3600 + parseInt(minutes) * 60 + seconds;
    }

    // Handle "h:mm:ss" format (e.g., "1:03:18")
    if (typeof duration === 'string' && /^\d+:\d+:\d+$/.test(duration)) {
        const [hours, minutes, seconds] = duration.split(':');
        return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
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
    // If already in "h:mm:ss" or "m:ss" format, return as is
    if (typeof seconds === 'string' && /^\d+:\d+(:\d+)?$/.test(seconds)) {
        return seconds;
    }

    if (typeof seconds !== 'number' || isNaN(seconds)) {
        return "0:00:00"; // Handle invalid cases safely
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`; // Maintain original format for < 1 hour
};

// New function to add duration to item.duration
export const addDuration = (item, newDuration) => {
    // If item.duration is not set, assign newDuration directly
    if (!item.duration) {
        item.duration = newDuration;
        return;
    }

    // Convert both durations to seconds
    const currentSeconds = convertISODurationToSeconds(item.duration);
    const newSeconds = convertISODurationToSeconds(newDuration);

    // If either duration is invalid, keep the original
    if (typeof currentSeconds !== 'number' || typeof newSeconds !== 'number') {
        return;
    }

    // Add the durations and format back to time
    const totalSeconds = currentSeconds + newSeconds;
    item.duration = formatTime(totalSeconds);
};

// Example usage
const item = { duration: "5:30" }; // Existing duration (5 minutes, 30 seconds)
addDuration(item, "17:00"); // Add 17 minutes
console.log(item.duration); // Output: "22:30" (5:30 + 17:00 = 22 minutes, 30 seconds)

// If item.duration is not set
const newItem = {};
addDuration(newItem, "17:00");
console.log(newItem.duration); // Output: "17:00"