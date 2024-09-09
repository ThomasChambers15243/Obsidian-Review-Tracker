import { ItemView, WorkspaceLeaf, Notice, Plugin, TFile, MarkdownRenderer} from "obsidian";
import { AddNotesFromFile, GetReviewNotes, GetAllNotesAsText, SyncNotes, SaveReview, GetSettings } from "Tracker/tracker";



export const VIEW = "notes-tracker";

export class ReviewTrackerView extends ItemView {
  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW;
  }

  getDisplayText(): string {
    return "Example View";
  }

  async onOpen() {  
    GetSettings();
    let isReview = false;
    const container = this.containerEl.children[1];
    container.empty();

    container.createEl("h1", { text: "Notes Tracker" });

    const intro = container.createEl("div", {cls: "intro"});
    intro.createEl("h3", { text: "Guide"});
    intro.createEl("small", {
      text: "Track your note reviews and organise your long term study. Add a note\
            to get started.\n"
    });
        

    this.registerEvent(this.app.vault.on('modify', (file) => {
      if (file instanceof TFile) {
          // Sync notes
          Sync(noteWindow, isReview);
      }
    }));
  
    
    this.registerEvent(this.app.workspace.on('file-open', (file) => {
        if (file instanceof TFile) {
            // Sync notes
            Sync(noteWindow, isReview);
        }
    }));

    // Button List
  const buttonList = ["Sync Notes with Vault",  "Generate Review"];
  
  buttonList.forEach((buttonText) => {
    const button = container.createEl("button", { text: buttonText, cls: "button-note" });

    // Click event for each button
    button.addEventListener("click", async () => {
      switch (buttonText) {
        case "Sync Notes with Vault":      
          // Sync notes
          Sync(noteWindow, isReview);

          break;

        case "Generate Review":
          // Add your logic for generating a review here
          isReview = true;
          Sync(noteWindow, isReview);
          // Review Area
          noteWindowTitle.innerText = "Notes to Review";     
          setReviewButtons(true, [saveButton, ignoreButton]);   
          displayReview(noteWindow, await GetReviewNotes());          
          break;

        default:
          break;
      }
    });
  });
  

  // Where current notes and reviews are viewed
  const noteWindowTitle = container.createEl("h2", {
    text: "Current Notes",
    cls: "view-title"
  });
    const reviewButtons = container.createEl("div", {cls: "review-buttons"})  
    const saveButton = reviewButtons.createEl("button", {text: "Save", cls: "button-note"});
    const ignoreButton = reviewButtons.createEl("button", {text: "Ignore", cls: "button-note"});
    setReviewButtons(false, [saveButton, ignoreButton]);

    saveButton.addEventListener("click", async () => {
      SaveReview();
      isReview = false;
      setReviewButtons(false, [saveButton, ignoreButton]);
      Sync(noteWindow, isReview);
      new Notice("Notes Updated");
    })
    ignoreButton.addEventListener("click", () => {
      isReview = false;
      setReviewButtons(false, [saveButton, ignoreButton]);
      Sync(noteWindow, isReview);
      new Notice("Review Aborted");
    })

  const noteWindow = container.createEl("div", { cls: "media-window"});

  noteWindow.empty();
  await Sync(noteWindow, isReview);
}



  

  async onClose() {
    // Cleanup when view is closed    
  }
}

async function Sync(noteWindow: HTMLDivElement, isReview=false) {
  if (isReview) {return;}
  const markdownFiles: TFile[] = this.app.vault.getMarkdownFiles();
     
  let headerNames: Map<string, {name: string, path: string}>  =  new Map();

  for (const file of markdownFiles) {
    // TODO set depth to setting file                                  
      await AddNotesFromFile(file).then(
          function(value: string[]) {
              value.forEach(name => {
                  headerNames.set(file.path.concat(name), {name: name, path: file.path});
              });
          },
          function(error) {
              console.log(`No headers in file: ${file.path}. Error: ${error}`);
          },
      );                        
  }
                      
  if (await SyncNotes(headerNames)) {
    // Update Text

    let notesMarkdown = await GetAllNotesAsText();
  
    noteWindow.empty();
      
    MarkdownRenderer.render(
        this.app,
        notesMarkdown,
        noteWindow,
        '',
        this.app.workspace
    );
     // Add an event listener to handle link clicks
    noteWindow.querySelectorAll('a').forEach(linkEl => {
      linkEl.addEventListener('click', async (event) => {
          event.preventDefault(); // Prevent default link behavior
          
          const link = (event.target as HTMLAnchorElement).getAttribute('href');
          if (link) {
              // Open the link in Obsidian
              await this.app.workspace.openLinkText(link, '', true);
          }
      });
    })
  }
}

function displayReview(noteWindow: HTMLDivElement, notesMarkdown: string) {
  noteWindow.empty();
      
  MarkdownRenderer.render(
      this.app,
      notesMarkdown,
      noteWindow,
      '',
      this.app.workspace
  );
   // Add an event listener to handle link clicks
  noteWindow.querySelectorAll('a').forEach(linkEl => {
    linkEl.addEventListener('click', async (event) => {
        event.preventDefault(); // Prevent default link behavior
        
        const link = (event.target as HTMLAnchorElement).getAttribute('href');
        if (link) {
            // Open the link in Obsidian
            await this.app.workspace.openLinkText(link, '', true);
        }
    });
  })
}



function setReviewButtons(show: boolean, buttons: HTMLButtonElement[]) {
  buttons.forEach((button) => {
    if (show) {      
      button.show();
    } else {
      button.hide();
    }
  })
}

// Uuuuuh \\

    // Remove the option to manually add and remove notes
    // if you want that, use the Rust CLI version instead

    // const body = container.createEl("div");
    // const buttonAddNote = body.createEl("button", {
    //   text: "Submit Note",
    //   cls: "button-note"
    // });

    // const textAreaAddNote = body.createEl("textarea", {
    //   text: "",
    //   cls: "textarea-note"
    // })

    // const buttonRemoveNote = body.createEl("button", {
    //   text: "Remove Note",
    //   cls: "button-note"
    // })

    // const textAreaRemoveNote = body.createEl("textarea", {
    //   text: "",
    //   cls: "textarea-note"
    // })

    // buttonAddNote.addEventListener("click", async () => {
    //   const noteName = textAreaAddNote.value;
    //   if (noteName.length >= 1) {   
    //     if (await AddNote(noteName)) {
    //       new Notice(`Note ${noteName} added`, 3000);
    //       tempText.innerText = await GetNotesAsText();
    //     } else {
    //       new Notice(`Note ${noteName} already exists`, 3000);
    //     }
    //   }
    // })

    // buttonRemoveNote.addEventListener("click", async () => {
    //   const noteName = textAreaRemoveNote.value;
    //   if (noteName.length >= 1) {
    //     if (await RemoveNote(noteName)) {
    //       new Notice(`Note ${noteName} was removed.`, 3000);   
    //       tempText.innerText = await GetNotesAsText(); 
    //     } else {
    //       new Notice(`Note ${noteName} was not found.`)
    //     }
    //   }      
    // })