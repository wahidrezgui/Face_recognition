function addStyles(win, styles) {
  styles.forEach((style) => {
    let link = win.document.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("type", "text/css");
    link.setAttribute("href", style);
    win.document.getElementsByTagName("head")[0].appendChild(link);
  });
}

const VueHtmlToPaper = {
  install(app, options = {}) {
    app.config.globalProperties.$htmlToPaper = (
      el,
      localOptions,
      cb = () => true
    ) => {
      let defaultName = "_blank",
        defaultSpecs = ["fullscreen=yes", "titlebar=yes", "scrollbars=yes"],
        defaultReplace = true,
        defaultStyles = ["https://gate.qatar.gov/resources/css/app.css"];
      let {
        name = defaultName,
        specs = defaultSpecs,
        replace = defaultReplace,
        styles = defaultStyles,
        inlineStyles = '',
        title = 'تقرير الحضور اليومي',
      } = options;

      // If has localOptions
      if (!!localOptions) {
        if (localOptions.name) name = localOptions.name;
        if (localOptions.specs) specs = localOptions.specs;
        if (localOptions.replace) replace = localOptions.replace;
        if (localOptions.styles !== undefined) styles = localOptions.styles;
        if (localOptions.inlineStyles) inlineStyles = localOptions.inlineStyles;
        if (localOptions.title) title = localOptions.title;
      }

      specs = !!specs.length ? specs.join(",") : "";

      const element = window.document.getElementById(el);

      if (!element) {
        alert(`Element to print #${el} not found!`);
        return;
      }

      const url = "";
      const win = window.open(url, name, specs, replace);

      const baseHref = `${window.location.origin}/`;
      const styleBlock = inlineStyles
        ? `<style type="text/css">${inlineStyles}</style>`
        : '';

      win.document.write(`
          <html dir="rtl" lang="ar">
            <head>
              <base href="${baseHref}">
              <title>${title}</title>
              ${styleBlock}
            </head>
            <body>
              ${element.innerHTML}
            </body>
          </html>
        `);

      if (styles.length) {
        addStyles(win, styles);
      }

      setTimeout(() => {
        win.document.close();
        win.focus();
        win.print();
        win.close();
        cb();
      }, 1000);

      return true;
    };
  }
};

export default VueHtmlToPaper;
