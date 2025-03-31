const fs = require("fs");

export function processTemplate(templatePath, variables) {
  let template = fs.readFileSync(templatePath, "utf8");

  // Replace all variables in the template
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, "g");
    template = template.replace(regex, value);
  });

  return template;
}
