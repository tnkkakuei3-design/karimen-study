// Retired migration route: return to this site without reading or writing records.
location.replace(new URL("./", location.href).href);
