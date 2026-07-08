import { bookableServices, canFitServiceAtTime, getAvailableTimesForDate, isClosedDay } from "@/lib/studio-data";
import { getOccupiedTimesFromAppsScript } from "./apps-script-client";
import { getOccupiedTimesFromIcs } from "./google-ics-client";

export function validateAvailabilityDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

async function getOccupiedTimes(date: string) {
  try {
    const appsScriptTimes = await getOccupiedTimesFromAppsScript(date);
    if (appsScriptTimes) return appsScriptTimes;
  } catch (error) {
    console.log(error instanceof Error ? error.message : String(error));
  }

  return getOccupiedTimesFromIcs(date);
}

export async function getAvailability(date: string, serviceId: string) {
  const service = bookableServices.find((item) => item.id === serviceId) || bookableServices[0];

  if (isClosedDay(date)) {
    return { date, occupiedTimes: [], slots: [], closed: true };
  }

  try {
    const occupiedTimes = await getOccupiedTimes(date);
    const slots = getAvailableTimesForDate(date).map((time) => {
      const occupied = occupiedTimes.includes(time);
      const fits = canFitServiceAtTime(time, date, service.duration);
      return { time, available: !occupied && fits, status: occupied ? "ocupado" : fits ? "livre" : "sem tempo" };
    });

    return { date, occupiedTimes, slots, closed: false };
  } catch (error) {
    console.log(error instanceof Error ? error.message : String(error));
    const slots = getAvailableTimesForDate(date).map((time) => {
      const fits = canFitServiceAtTime(time, date, service.duration);
      return { time, available: fits, status: fits ? "livre" : "sem tempo" };
    });
    return { date, occupiedTimes: [], slots, closed: false, fallback: true };
  }
}
