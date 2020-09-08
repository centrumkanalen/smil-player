import * as xml2js from 'xml2js';
// @ts-ignore
import { JefNode } from 'json-easy-filter';
import { DOMParser } from 'xmldom';
import {
	RegionAttributes,
	RegionsObject,
	RootLayout,
	DownloadsList,
	SMILFileObject,
	SMILPlaylist,
	XmlSmilObject, SMILFile,
} from '../../models';
import { SMILEnums } from '../../enums';
import { defaults as config } from '../../config';
import { debug, containsElement } from './tools';

async function parseXml(xmlFile: string): Promise<SMILFileObject> {
	const downloads: DownloadsList = {
		video: [],
		img: [],
		ref: [],
		audio: [],
		intro: [],
	};
	const xmlFileSerialized: Document = new DOMParser().parseFromString(xmlFile, "text/xml");
	debug('Xml string serialized : %O', xmlFileSerialized);
	const xmlObject: XmlSmilObject = await xml2js.parseStringPromise(xmlFileSerialized, {
		mergeAttrs: true,
		explicitArray: false,
	});

	debug('Xml file parsed to json object: %O', xmlObject);

	const regions = <RegionsObject> extractRegionInfo(xmlObject.smil.head.layout);
	const playableMedia = <SMILPlaylist> extractBodyContent(xmlObject.smil.body);
	new JefNode(playableMedia.playlist).filter(function (node: { key: string; value: any; }) {
		// detect intro element, may not exist
		if (node.key === 'end' && node.value === '__prefetchEnd.endEvent') {
			// @ts-ignore
			new JefNode(node.parent.value).filter(function (introNode: { key: string; value: any; }) {
				if (config.constants.extractedElements.includes(introNode.key)) {
					// @ts-ignore
					debug('Intro element found: %O', introNode.parent.value);
					// @ts-ignore
					downloads.intro.push(introNode.parent.value);
				}
			});
		}
		if (config.constants.extractedElements.includes(node.key)) {
			// create media arrays for easy download/update check
			if (!Array.isArray(node.value)) {
				node.value = [node.value];

			}
			node.value.forEach((element: SMILFile) => {
				// @ts-ignore
				if (!containsElement(downloads[node.key], element.src)) {
					// @ts-ignore
					downloads[node.key].push(element);
				}
			});
		}
	});

	debug('Extracted regions object: %O', regions);
	debug('Extracted playableMedia object: %O', playableMedia);
	debug('Extracted downloads object: %O', downloads);

	return Object.assign({}, regions, playableMedia, downloads);
}

function extractRegionInfo(xmlObject: object): RegionsObject {
	const regionsObject: RegionsObject = {
		region: {},
	};
	Object.keys(xmlObject).forEach((rootKey) => {
		// multiple regions in layout element
		// @ts-ignore
		if (Array.isArray(xmlObject[rootKey])) {
			// iterate over array of objects
			// @ts-ignore
			Object.keys(xmlObject[rootKey]).forEach((index) => {
				//creates structure like this
				// {
				//     "region": {
				//         "video": {
				//             "regionName": "video",
				//                 "left": "0",
				//                 "top": "0",
				//                 "width": "1080",
				//                 "height": "1920",
				//                 "z-index": "1",
				//                 "backgroundColor": "#FFFFFF",
				//                 "mediaAlign": "center"
				//         },
				//         "custom": {
				//             "regionName": "custom",
				//                 "left": "0",
				//                 "top": "0",
				//                 "width": "1080",
				//                 "height": "1920",
				//                 "z-index": "1",
				//                 "backgroundColor": "#FFFFFF",
				//                 "mediaAlign": "center"
				//         }
				//     }
				// }
				// @ts-ignore
				if (xmlObject[rootKey][index].hasOwnProperty('regionName')) {
					// @ts-ignore
					regionsObject.region[xmlObject[rootKey][index].regionName] = <RegionAttributes> xmlObject[rootKey][index];
				} else {
					// @ts-ignore
					regionsObject.region[xmlObject[rootKey][index][config.constants.regionNameAlias]] = <RegionAttributes> xmlObject[rootKey][index];

				}
			});
		} else {
			// only one region/rootLayout in layout element
			if (rootKey === SMILEnums.rootLayout) {
				// @ts-ignore
				regionsObject.rootLayout = <RootLayout> xmlObject[rootKey];
				// add left and top values for intro play
				regionsObject.rootLayout.top = '0';
				regionsObject.rootLayout.left = '0';
			}

			if (rootKey === SMILEnums.region) {
				// @ts-ignore
				if (xmlObject[rootKey].hasOwnProperty('regionName')) {
					// @ts-ignore
					regionsObject.region[xmlObject[rootKey].regionName] = <RegionAttributes> xmlObject[rootKey];
				} else {
					// @ts-ignore
					regionsObject.region[xmlObject[rootKey][config.constants.regionNameAlias]] = <RegionAttributes> xmlObject[rootKey];

				}
			}
		}
	});

	return regionsObject;
}

function extractBodyContent(xmlObject: object): SMILPlaylist {
	const playlist = {
		playlist: {},
	};
	playlist.playlist = <SMILPlaylist> xmlObject;
	return playlist;
}

export async function processSmil(xmlFile: string): Promise<SMILFileObject> {
	const smilObject = await parseXml(xmlFile);
	// console.log(JSON.stringify(smilObject));
	return smilObject;
}
