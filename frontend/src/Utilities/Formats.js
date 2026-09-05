export function DateInWords(dateString) {
  const inputDate = new Date(dateString);

  const day = inputDate.toLocaleString("en-us", { weekday: "long" });
  const month = inputDate.toLocaleString("en-us", { month: "long" });
  const date = inputDate.getDate();
  const year = inputDate.getFullYear();

  return day + ", " + month + " " + date + ", " + year;
}

export function TimeInWords(timeString) {
  const inputTime = new Date(
    "1970-01-01T" + timeString + "Z"
  ).toLocaleTimeString("en-US", {
    timeZone: "UTC",
    hour12: true,
    hour: "numeric",
    minute: "numeric",
  });

  return inputTime;
}

export function OriginalFilesInList(inputFileList) {
  // Handle null/undefined cases
  if (inputFileList === undefined || inputFileList === null) {
    return "";
  }

  // Handle FileList objects (from input[type="file"])
  if (inputFileList instanceof FileList) {
    if (inputFileList.length === 0) return "";
    return Array.from(inputFileList)
      .map((file) => file.name)
      .join(", ");
  }

  // Handle single File object
  if (inputFileList instanceof File) {
    return inputFileList.name;
  }

  // Handle arrays of files or strings
  if (Array.isArray(inputFileList)) {
    if (inputFileList.length === 0) return "";

    const originalFiles = inputFileList.map((x) => {
      // Handle File objects in array
      if (x instanceof File) {
        x = x.name;
      }

      // Skip empty or non-string items
      if (!x || typeof x !== "string") {
        return "";
      }

      // Extract original filename from pattern
      return x.split("_").length > 1 ? x.split("_")[2] : x;
    });

    return originalFiles.filter((name) => name !== "").join(", ");
  }

  // Handle string case
  if (typeof inputFileList === "string") {
    if (inputFileList.length === 0) return "";
    return inputFileList.split("_").length > 1
      ? inputFileList.split("_")[2]
      : inputFileList;
  }

  // Fallback for other types
  return String(inputFileList);
}
