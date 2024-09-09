import { PluginSettingTab, App, Setting } from 'obsidian';
import ReviewTracker from '../main'; 

export interface TrackerSettings {
    requireTag: boolean,
    tags: string[],
    headerLevel: number,
  }

export class ReviewTrackerSettingTab extends PluginSettingTab {
    plugin: ReviewTracker;

    constructor(app: App, plugin: ReviewTracker) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();

        containerEl.createEl("h2", {text: "Notes Tracker Settings"});

        new Setting(containerEl)
            .setName("Require Tag")
            .setDesc("If true, only files with a tag from 'tags' will be trackers. If false, all files are tracked.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.requireTag)
                .onChange(async (value) => {
                    this.plugin.settings.requireTag = value;
                    await this.plugin.saveSettings();
                })
            )

        new Setting(containerEl)
            .setName("Tags")
            .setDesc("List of accepted tags for tracking")
            .addText(text => {                
                const tagsContainer = containerEl.createEl('div', { cls: 'tags-container' });
                
                // Refreshes tags
                const refreshTags = () => {
                    tagsContainer.empty(); 
                    this.plugin.settings.tags.forEach((tag, index) => {
                        const tagElement = tagsContainer.createEl('div', { text: tag, cls: 'tag-item' });
                        
                        // Removes existing tags
                        const removeButton = tagElement.createEl('button', { text: 'x', cls: 'tag-remove' });
                        removeButton.onclick = async () => {
                            this.plugin.settings.tags.splice(index, 1);
                            await this.plugin.saveSettings();
                            // Reset tags
                            refreshTags();
                        };
                    });
                };
                refreshTags();
                // When user presses enter
                const inputEl = text.inputEl;
                inputEl.setAttribute("placeholder", "Add a new tag and press Enter");                
                inputEl.addEventListener('keydown', async (evt) => {
                    if (evt.key === 'Enter') {
                        evt.preventDefault();
                        const newTag = inputEl.value.trim();
                        if (newTag && !this.plugin.settings.tags.includes(newTag)) {
                            this.plugin.settings.tags.push(newTag);
                            await this.plugin.saveSettings();
                            refreshTags();
                        }
                        inputEl.value = '';
                    }
                });
            });

    
    
    
        new Setting(containerEl)
            .setName("Smallest Header Level")
            .addDropdown(drop=> 
                drop.addOptions({
                    "1" : "1",
                    "2" : "2",
                    "3" : "3",
                    "4" : "4",
                    "5" : "5",
                    "6" : "6"
                })
                .setValue(this.plugin.settings.headerLevel?.toString() || "1")
                .onChange( async (value) => {
                    this.plugin.settings.headerLevel = parseInt(value);
                    await this.plugin.saveSettings();
                })
            )
            
    }
}

