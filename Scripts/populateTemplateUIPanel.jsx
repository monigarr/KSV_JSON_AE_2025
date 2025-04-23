
/*
 * Adobe After Effects ExtendScript
 * Script: populateTemplateUIPanel.jsx
 * Version: 1.0
 * Author: monigarr@MoniGarr.com
 * 
 * Description:
 * This script automates the creation and rendering of video compositions in Adobe After Effects
 * based on data from JSON files. It imports assets, creates compositions, adds animations and text,
 * and renders each composition into MP4 files using Adobe Media Encoder.
 * 
 * Features:
 * - UI Panel in Adobe After Effects allows you to choose your JSON File data.
 * - Dynamic creation of compositions based on JSON data.
 * - Handles image and audio asset imports.
 * - Implements animations for logos, text, and image reveals.
 * - Automates rendering using Adobe Media Encoder for efficient output.
 * 
 * Requirements:
 * - Adobe After Effects (tested with version 2025)
 * - Adobe Media Encoder for rendering MP4 files
 * - JSON data file specifying composition details (word, image, audio)
 * 
 * Usage:
 * 1. Ensure assets are correctly referenced in your JSON file.
 * 2. Run the script in Adobe After Effects with Main_Template.aep project open and saved.
 * 3. Follow prompts to select JSON file (oneitem.json or KSVTest1.json) and observe script-generated compositions.
 * 
 * Notes:
 * - Adjust `initialScaleValue` and `finalScaleValue` for text animation effects.
 * - Requires `Main_Template.aep` project file for composition setup.
 * - Renders are saved to the `Generated_Comps` folder within the project directory.
 * 
 * Future Enhancements:
 * - Integration with Adobe Firefly API for dynamic image content population.
 */

// Function to read JSON file
function readJSON(filePath) {
    var file = new File(filePath);
    if (!file.exists) {
        alert("JSON file not found: " + filePath);
        return null;
    }
    file.open("r");
    var content = file.read();
    file.close();
    return JSON.parse(content);
}

// Function to create UI panel
function createUI() {
    var scriptUIPanel = new Window("palette", "Generate Comps from JSON", undefined, {
        closeButton: false
    });

    // Title
    var titleText = scriptUIPanel.add("statictext", undefined, "GENERATE COMPS FROM JSON");
    titleText.alignment = "center";
    titleText.characters = 30;
    titleText.font = ScriptUI.newFont("Arial-BoldMT", "BOLD", 20);

    // JSON File Group
    var jsonGroup = scriptUIPanel.add("group");
    jsonGroup.orientation = "row";
    var jsonFileText = jsonGroup.add("statictext", undefined, "JSON File:");
    var jsonFilePath = jsonGroup.add("edittext", undefined, "", {
        readonly: true
    });
    jsonFilePath.preferredSize.width = 300;
    var browseButton = jsonGroup.add("button", undefined, "BROWSE");

    // Button Group
    var buttonGroup = scriptUIPanel.add("group");
    buttonGroup.alignment = "center";
    var generateButton = buttonGroup.add("button", undefined, "GENERATE COMPS");
    generateButton.enabled = false; // Initially disabled until JSON file is selected
    var closeButton = buttonGroup.add("button", undefined, "CLOSE");

    // Event listeners
    browseButton.onClick = function() {
        var file = File.openDialog("Select JSON File", "*.json", false);
        if (file) {
            jsonFilePath.text = file.fsName;
            generateButton.enabled = true;
        }
    };

    generateButton.onClick = function() {
        var jsonFilePathValue = jsonFilePath.text;
        if (jsonFilePathValue) {
            generateCompositions(jsonFilePathValue);
        } else {
            alert("Please select a JSON file first.");
        }
    };

    closeButton.onClick = function() {
        scriptUIPanel.close();
    };

    scriptUIPanel.layout.layout(true);
    scriptUIPanel.layout.resize();
    scriptUIPanel.center();
    scriptUIPanel.show();
}

// Main function to generate compositions from JSON data
function generateCompositions(jsonFilePath) {
    // Get reference to the current project
    var proj = app.project;
    if (!proj) {
        alert("No project open or failed to access the project.");
        return;
    }

    // Check if the project is saved
    if (!proj.file) {
        alert("Please save your project before generating compositions.");
        return;
    }

    // Read JSON data
    var jsonData = readJSON(jsonFilePath);
    if (!jsonData) {
        alert("Failed to read JSON data.");
        return;
    }

    // Define output folder relative to project
    var outputFolder = new Folder(proj.file.path + "/Generated_Comps");
    if (!outputFolder.exists) {
        outputFolder.create();
    }

    var initialScaleValue = 0;
    var finalScaleValue = 500;

    for (var i = 0; i < jsonData.length; i++) {
        var item = jsonData[i];
        var word = item.word;
        var imageFilePath = item.image;
        var audioFilePath = item.audio;

        var imageFile = new File(proj.file.path + "/" + imageFilePath);
        var audioFile = new File(proj.file.path + "/" + audioFilePath);

        if (!imageFile.exists || !audioFile.exists) {
            alert("Asset file not found: " + (imageFile.exists ? audioFilePath : imageFilePath));
            continue;
        }

        var imageFootage = proj.importFile(new ImportOptions(imageFile));
        var audioFootage = proj.importFile(new ImportOptions(audioFile));

        var compName = "Video_" + item.word;
        var compWidth = 1920;
        var compHeight = 1080;
        var compDuration = 15;
        var compFrameRate = 30;
        var compBGColor = [1, 1, 1];

        var newComp = proj.items.addComp(compName, compWidth, compHeight, 1, compDuration, compFrameRate);
        newComp.bgColor = compBGColor;

        // Add solid white bground layer to each new comp
        // move to bottom of layer stack
        var bgLayer = newComp.layers.addSolid([1, 1, 1], "White Background", compWidth, compHeight, 1);
        bgLayer.moveToEnd();

        // Logo or Mascot Image : animation to reveal image, then it disappears
        var logoFile = new File(proj.file.path + "/Assets/Images/mascot.jpg");
        var logoFootage = proj.importFile(new ImportOptions(logoFile));
        var logoLayer = newComp.layers.add(logoFootage);
        logoLayer.position.setValue([compWidth / 4, compHeight / 4]);
        var logoScale = Math.min(compWidth / logoLayer.width, compHeight / logoLayer.height) * 50;
        logoLayer.scale.setValue([logoScale, logoScale]);

        var logoOpacity = logoLayer.opacity;
        logoOpacity.setValueAtTime(2, 100);
        logoOpacity.setValueAtTime(2 + 0.5, 0);
        logoLayer.outPoint = 3;

        // Letter Animation from Main Word Text in JSON (item.word)
        var letters = [];
        for (var j = 0; j < word.length; j++) {
            var letter = word.charAt(j);
            var letterComp = newComp.layers.addText(letter);
            // position letter next to previous letter 
            letterComp.position.setValue([compWidth / 2 - (word.length / 2) * 50 + j * 200, compHeight * 0.7]);
            var letterOpacity = letterComp.opacity;
            letterOpacity.setValueAtTime(j, 0);
            letterOpacity.setValueAtTime(j + 1, 100);
            var letterScale = letterComp.scale;
            letterScale.setValueAtTime(j, [initialScaleValue, initialScaleValue]);
            letterScale.setValueAtTime(j + 1, [finalScaleValue, finalScaleValue]);
            letters.push(letterComp);
            letterComp.outPoint = 5;
        }

        // Main Image Appear Above Text (JSON item.image)
        var imageLayer = newComp.layers.add(imageFootage);
        imageLayer.position.setValue([compWidth / 3, compHeight / 3]);
        var imageScale = Math.min(compWidth / imageLayer.width, compHeight / imageLayer.height) * 50;
        imageLayer.scale.setValue([imageScale, imageScale]);

        var imageOpacity = imageLayer.opacity;
        imageOpacity.setValueAtTime(0, [0]);
        imageOpacity.setValueAtTime(4, [100]);
        imageLayer.startTime = 3;
        imageLayer.outPoint = newComp.duration;

        // Main Word Text show AFTER Text Animation (JSON item.word)
        var textLayer = newComp.layers.addText(word);
        textLayer.position.setValue([compWidth / 2, compHeight * 0.9]);
        textLayer.anchorPoint.setValue([textLayer.sourceRectAtTime(0, false).width / 2, 0]);
        var textProp = textLayer.property("Source Text");
        var textDocument = textProp.value;
        textDocument.fontSize = 500;
        textProp.setValue(textDocument);

        var textOpacity = textLayer.opacity;
        textOpacity.setValueAtTime(0, [0]);
        textOpacity.setValueAtTime(7, [100]);
        textLayer.startTime = 5;
        textLayer.outPoint = 15;
        //textLayer.enabled = false;

        // Audio (JSON item.audio)
        // play when item.word appears
        // play one more time at end of comp
        var audioLayer = newComp.layers.add(audioFootage);
        audioLayer.audioEnabled = true;
        audioLayer.startTime = 3;

        var totalRepeats = 1;
        var audioDuration = audioLayer.source.duration;
        for (var k = 1; k < totalRepeats; k++) {
            var repeatAudioLayer = newComp.layers.add(audioFootage);
            repeatAudioLayer.audioEnabled = true;
            repeatAudioLayer.startTime = 1 + k * audioDuration;
        }

        audioLayer.outPoint = newComp.duration;

        textLayer.scale.setValue([150, 150]);
        var scaleKeyframes = textLayer.scale;
        scaleKeyframes.setValueAtTime(newComp.duration - 1, [150, 150]);

        var audioLayer2 = newComp.layers.add(audioFootage);
        audioLayer2.startTime = 8;

        // Save changes to project file
        proj.save();
    }

    // Optionally add compositions to render queue
    // and render them using Adobe Media Encoder
    //renderCompositions(jsonData, outputFolder);
    renderComposition(comp, word, outputFolder);
    var renderFileName = "output_" + word.toLowerCase() + ".mp4";
    var renderFilePath = outputFolder.fullName + "/" + renderFileName;
    var renderQueue = app.project.renderQueue;
    var renderItem = renderQueue.items.add(comp);
    var outputModule = renderItem.outputModule(1);
    outputModule.file = new File(renderFilePath);
    outputModule.applyTemplate("Lossless");
    renderItem.timeSpanStart = 0;
    renderItem.timeSpanDuration = comp.duration;
    renderQueue.render();
    app.project.save();
}

// Function to log messages to console
function logMessage(message) {
    $.writeln(message);
}

// Run the UI creation function
createUI();