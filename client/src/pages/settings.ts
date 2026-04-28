

export function settingsPage() {
  return {
    html: `
      <section>
        <h1>Settings</h1>      
      </section>
    `,
    init() {
      console.log('settings page ready');
    }
  };
}