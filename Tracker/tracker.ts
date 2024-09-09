import { readFile, writeFile, mkdirSync, existsSync } from 'fs';
import { format, compareAsc, } from 'date-fns';
import { marked, TokensList } from "marked";

import * as path from 'path';
import { TFile } from 'obsidian';


interface Note {
    key: string,
    link: string;
    name: string;
    freq: number;
    lasy_reviewed: string;
}



// TODO 

// Syncs notes with json according to user settings
export async function SyncNotes(headerNames: Map<string, {name: string, path: string}>): Promise<boolean> {    
    // All current saved notes
    let notesMap: Map<string, Note> = new Map(Object.entries(await getStringFromJsonFile("notes.json")));    

    return new Promise((resolve) => {
        // Add new header values to map
        headerNames.forEach((nameAndLink, key) => {
            if (!notesMap.has(key)) {
                // Create a new note
                const newNote = {
                    key: key,
                    link: generateObsidianLink(nameAndLink.name, nameAndLink.path),
                    name: nameAndLink.name,
                    freq: 0,
                    lasy_reviewed: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
                }; 
                notesMap.set(key, newNote);
            } 
        })

        // Remove old header values from map
        notesMap.forEach((note, key) => {
            if (!headerNames.has(key)) {
                notesMap.delete(key);
            }
         })

        SaveMap(notesMap);      
        resolve(true);
    });
}


// Formats all the current notes as text
export async function GetAllNotesAsText(): Promise<string> {
    let notesMap: Map<string, Note> = new Map(Object.entries(await getStringFromJsonFile("notes.json")));
    let notesString = "";
    for (const note of notesMap.values()) {
        notesString += formatNote(note);
    }
    return notesString;
} 

export async function GetReviewNotes(): Promise<string> {
    let toReview = await GenerateReview();
    let byFreq = "";
    let byDate = "";
    // Extract Notes to formatted strings
    toReview.byFreq.forEach(note => {
        byFreq += formatNote(note);
    })
    toReview.byDate.forEach(note => {
        byDate += formatNote(note);
    })
    // Format review
    return byFreq + byDate;
}

export async function SaveReview(){
    let notesMap: Map<string, Note> = new Map(Object.entries(await getStringFromJsonFile("notes.json")));  
    let reviewedNotes = await GenerateReview();    
    let joinedNotes = reviewedNotes.byDate.concat(reviewedNotes.byFreq);

    joinedNotes.forEach((note) => {
        let existingNote = notesMap.get(note.key);

        if (existingNote) {
            // Update the frequency if it exists
            if (existingNote.freq !== undefined) {
                existingNote.freq += 1;
            }

            // Update the last reviewed date if it exists
            if (existingNote.lasy_reviewed !== undefined) {
                existingNote.lasy_reviewed = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
            }
        }
    })
    SaveMap(notesMap);
}

// Gets all header names from given file acording to header depth
export async function AddNotesFromFile(file: TFile): Promise<string[]> {    
    let settings = await GetSettings();    
    let headers: string[] = [];
    return new Promise(async (resolve, reject) => {
        try {
            const fileContent = await this.app.vault.read(file);
            const tokens = marked.lexer(fileContent.toString());
            // Check tags
            if (settings.requireTag) {
                if (!hasTrackingTag(tokens, settings)) {
                    reject("File not tracked")
                    return;
                }
            }
            tokens.forEach(token => {
                // Check Header
                if (token.type === "heading" && token.depth <= settings.headerLevel && token.text != "") {
                    headers.push(token.text);
                }
            });
            if (headers.length > 0) {
                resolve(headers);
            } else {
                reject("No headers found");
            }
        } catch (error) {
            reject(`Error reading file: ${error.message}`);
        }
    });
}

async function GenerateReview(): 
Promise <{
    byFreq: Note[],
    byDate: Note[],
}> {
    return new Promise(async (resolve) => {
        let notesMap: Map<string, Note> = new Map(Object.entries(await getStringFromJsonFile("notes.json")));
        let toReview = sortForReview(notesMap);
        resolve(toReview);
    });
}

function formatNote(note: Note): string {     
    return `**Name:** ${note.name}\n` +
    `**Link:** ${note.link} \n` +
    `**Freq:** ${note.freq}\n` +
    `**Last Reviewed:** ${note.lasy_reviewed}\n\n`;
}

function generateObsidianLink(headername: string, link: string): string {
    // Format the header:
    const formattedHeader = headername.trim().replace(/\s+/g, '-').toLowerCase();
    
    // Remove the file extension for the link and encode spaces
    const fileLink = encodeURI(link.replace(/\.md$/, ''));
    
    // Combine the file link with the formatted header
    return `[${headername}](${fileLink}#${formattedHeader})`;
}


function sortForReview(notesMap: Map<string, Note>) {
    let notesArray: Note[] = [];
    notesMap.forEach((note, key) => {
        notesArray.push(note);
    });

    // Sort by freq (least common)
    const byFreq = notesArray
        .sort((a, b) => a.freq - b.freq)
        .slice(0, 1);
    // Remove notes in byFreq from notesArray to stop duplication in the next sort
    for (let i = 0; i < byFreq.length; i++) {
        notesArray = notesArray.filter(function (el) {
            return el != byFreq[i];
        });
    }

    // Sort by data (oldest)
    const byDate = notesArray
        .sort((a, b) => compareAsc(new Date(a.lasy_reviewed), new Date(b.lasy_reviewed)))
        .slice(0, 1);

    return {
        byFreq,
        byDate,
    };
}

function SaveMap(notesMap: Map<string, Note>) {    
    const notesJson = JSON.stringify(Object.fromEntries(notesMap), null, 2);
    writeFile(GetFilePath("notes.json"), notesJson, (err) => {
        if (err) throw err;
    });
}

function getStringFromJsonFile(path: string): Promise<any> {
    const filePath = GetFilePath(path);

    return new Promise((resolve, reject) => {
        readFile(filePath, "utf8", (err, data) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    resolve({});
                } else {
                    reject(err);
                }
            } else {
                let result = "";
                // Look i know this is bad, but I'm new to TS & JS atm
                // and this just...seems to work?
                try {
                    result = JSON.parse(data);
                    resolve(JSON.parse(data));
                } catch (_) {
                    try {
                        result = JSON.parse(data);
                        resolve(JSON.parse(data));
                    } catch (error) {
                        reject("Could not parse json, error:" + error);
                    }
                }

            }
        });
    });
}

function GetFilePath(fileName: string): string {
    const pluginDir = getPluginDir();
    const filePath = path.join(pluginDir, fileName);
    return filePath;
}

// Function to get the plugin directory
function getPluginDir(): string {
    const basePath = this.app.vault.adapter.getBasePath();
    const pluginDir = path.join(basePath, ".obsidian", "plugins", "notes_tracker");

    // Ensure the plugin directory exists
    if (!existsSync(pluginDir)) {
        mkdirSync(pluginDir, { recursive: true });
    }

    return pluginDir;
}

// Settings
 export async function GetSettings(): Promise<{ headerLevel: number; requireTag: boolean; tags: string[]; }> {
    let settings = await getStringFromJsonFile("data.json");
    return settings
}

// Checks if user tags are inside the given token
function hasTrackingTag(tokens: TokensList, settings: { headerLevel: number; requireTag: boolean; tags: string[]; }): boolean {
    let tags: string[] = [];
    tokens.forEach(token => {
        if (token.type == "paragraph") {
            const contentRegex = /#(\w+)/g;
            let match;
            while ((match = contentRegex.exec(token.text)) !== null) {
                tags.push(match[1]);
            }
        }
    })
    for (const tag of tags) {
        if (settings.tags.includes(tag)) {
            return true;
        }
    }
    return false
}