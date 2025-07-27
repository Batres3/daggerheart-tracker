This is an alternative to the **[Initiative Tracker Plugin](https://github.com/javalent/initiative-tracker/tree/main)** for use with the Daggerheart TTRPG, please see **[here](https://plugins.javalent.com/it)** for the original documentation.

With this plugin, you can add creatures and NPCs to the tracker, and track their difficulty, health, stress, and other stats. The plugin also calculates battle points for encounters, and supports both custom and SRD creatures from the **[Fantasy Statblocks](https://github.com/javalent/fantasy-statblocks)** plugin.

## Features
- Add and remove creatures from the encounter
- Input creature name, Difficulty, HP and Stress
- Calculate encounter battle points according to the SRD rules
- Set creature display names to differentiate identical creatures
- Supports dice rolls to add random amount creatures
- Keep track of creature HP, Stress, Difficulty and status effects
- Input the damage, the plugin automatically compares it with the thresholds to determine how much HP to remove
- Automatically add the Vulnerable and Unconscious conditions upon reaching 0 Stress and HP, respectively
- Add several encounters in one code block
- Automatically save and load encounters
- And much, much more...

It is still missing support for environments, though it should be coming any day now.

## Installation
### Release
Navigate to the [Github Releases](https://github.com/Batres3/daggerheart-tracker/releases), find the latest release, and download the three files `main.js`, `manifest.json` and `styles.css`.
Go to your vault, head to the `.obsidian/plugins` folder and create a new folder within, called (for example) `daggerheart-tracker`, then put the three files you downloaded into it.
When you now open the community plugins section in obsidian, the plugin should show up.
### Manual
Go to the `.obsidian` folder within your vault, within that folder find the `plugins` folder, if it doesn't exist create it.
Clone this repository into your `plugins` folder, either with the following command
`git clone https://github.com/Batres3/daggerheart-tracker.git`
Or via downloading the source code and extracting it.

Once cloned, go into the folder,
`cd daggerheart-tracker`
And install the dependencies
`npm install`
Then build the package
`npm run build`
If you now load obsidian it should show up within the community plugins section.

### Quickstart

- Install the Initiative Tracker plugin in Obsidian.
- Open a note where you want to keep track of your encounter.
- Create a code block with the language set to \`\`\`encounter.

````yaml
```encounter
name: Example
creatures:
 - 3: Goblin
```
````

- Add creatures to the encounter by name, dice roll or bestiary entry.
- Launch the encounter by clicking on the play button, and start tracking initiative.

Check out the **[plugin documentation](https://plugins.javalent.com/it)** for more detailed instructions and examples.

## Support

If you encounter any issues, want to give back and help out, or have suggestions for new features, file an issue on the **[GitHub repository](https://github.com/valentine195/obsidian-initiative-tracker/issues)**.

### TTRPG plugins

If you're using Obsidian to run/plan a TTRPG, you may find these other plugins by the original author useful

- **[Obsidian Leaflet](https://github.com/valentine195/obsidian-leaflet-plugin)** Adds interactive maps to Obsidian notes
- **[Dice Roller](https://github.com/valentine195/obsidian-dice-roller)** Inline dice rolling for Obsidian
- **[Fantasy Statblocks](https://github.com/valentine195/obsidian-5e-statblocks)** Format Statblocks inside Obsidian
