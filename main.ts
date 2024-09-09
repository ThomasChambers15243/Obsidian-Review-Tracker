import { Plugin } from "obsidian";
import { ReviewTrackerView, VIEW } from "./Tracker/notes-tracker";
import { ReviewTrackerSettingTab } from "./Tracker/setting-tab";
import { TrackerSettings } from "./Tracker/setting-tab";


const DEFAULT_SETTINGS: Partial<TrackerSettings> = {
  requireTag: true,
  tags: ["Rtrack"],
  headerLevel: 2,
};

export default class ReviewTracker extends Plugin {
  settings: TrackerSettings;

  async onload() {

    await this.loadSettings();

    this.addSettingTab(new ReviewTrackerSettingTab(this.app, this));

    this.registerView(
		VIEW,
      (leaf) => new ReviewTrackerView(leaf)
    );

    this.addRibbonIcon("dice", "Review Tracker", () => {
      this.activateView();
    });

  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
}

  async activateView() {
    const leaf = this.app.workspace.getRightLeaf(false);
	if (leaf != null) {
		await leaf.setViewState({
		  type: VIEW,
		  active: true,
		});
		this.app.workspace.revealLeaf(leaf);
	}

  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW);
  }
}
