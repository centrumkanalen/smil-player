import get = require('lodash/get');
import isNil = require('lodash/isNil');
import cloneDeep = require('lodash/cloneDeep');
import moment from 'moment';
import hash from 'object-hash';

import {
	CurrentlyPlayingRegion,
	InfiniteLoopObject,
	PlaylistElement,
	PrefetchObject,
} from '../../../models/playlistModels';
import { getFileName } from '../../files/tools';
import { DeviceModels } from '../../../enums/deviceEnums';
import Debug from 'debug';
import { RegionAttributes, RegionsObject } from '../../../models/xmlJsonModels';
import { XmlTags } from '../../../enums/xmlEnums';
import { SMILEnums } from '../../../enums/generalEnums';
import { parseNestedRegions } from '../../xmlParser/tools';
import { SMILAudio, SMILImage, SMILVideo, SMILWidget } from '../../../models/mediaModels';

export function generateElementId(filepath: string, regionName: string, key: string): string {
	return `${getFileName(filepath)}-${regionName}-${key}`;
}

export function getStringToIntDefault(value: string): number {
	return parseInt(value) || 0;
}

export function errorVisibility(visible: boolean) {
	const display = visible ? 'block' : 'none';

	(<HTMLElement> document.getElementById('error')).style.display = display;
	(<HTMLElement> document.getElementById('errorText')).style.display = display;
}

export function checkSlowDevice(deviceType: string): boolean {
	for (const type of DeviceModels.slowerDevices) {
		if (deviceType.startsWith(type)) {
			return true;
		}
	}
	return false;
}

export function getLastArrayItem(array: any[]): any {
	return array[array.length - 1];
}

export const debug = Debug('@signageos/smil-player:playlistModule');

function checkPrefetchObject(obj: PrefetchObject, path: string): boolean {
	return get(obj, path, 'notFound') === 'notFound';
}

/**
 * used for detection infinite loops in SMIL file
 * these are seq or par section which does not contain any media files:
 * 	example:
 * 		seq: [{
 * 			dur: "60s"
 * 			}, {
 * 			prefetch: [{
 * 				src: "http://butikstv.centrumkanalen.com/play/render/widgets/ebbapettersson/top/top.wgt"
 * 					}, {
 * 				src: "http://butikstv.centrumkanalen.com/play/render/widgets/ebbapettersson/vasttrafik/vasttrafik_news.wgt"
 * 					}, {
 * 				src: "http://butikstv.centrumkanalen.com/play/media/rendered/bilder/ebbalunch.png"
 * 					}, {
 * 				src: "http://butikstv.centrumkanalen.com/play/media/rendered/bilder/ebbaical.png"
 * 					}]
 * 				}]
 * @param obj
 */
export function isNotPrefetchLoop(obj: InfiniteLoopObject | PlaylistElement): boolean {
	let result = true;
	if (Array.isArray(get(obj, 'seq', 'notFound'))) {
		(<PrefetchObject[]> get(obj, 'seq', 'notFound')).forEach((elem: PrefetchObject) => {
			result = checkPrefetchObject(elem, 'prefetch');
		});
	}

	if (Array.isArray(get(obj, 'par', 'notFound'))) {
		(<PrefetchObject[]> get(obj, 'par', 'notFound')).forEach((elem: PrefetchObject) => {
			result = checkPrefetchObject(elem, 'prefetch');
		});
	}
	if (get(obj, 'seq.prefetch', 'notFound') !== 'notFound') {
		result = false;
	}

	if (get(obj, 'par.prefetch', 'notFound') !== 'notFound') {
		result = false;
	}

	// black screen check, will be removed in future versions
	if (get(obj, 'seq.ref.src', 'notFound') === 'adapi:blankScreen') {
		result = false;
	}

	// black screen check, will be removed in future versions
	if (get(obj, 'par.ref.src', 'notFound') === 'adapi:blankScreen') {
		result = false;
	}

	return result;
}

/**
 * set correct dimensions to work on all displays correctly, changes values from % to fix numbers ( 50% -> 800px )
 * @param regionInfo - represents object with information about dimensions of region specified in smil file
 */
export function fixVideoDimension(regionInfo: RegionAttributes): RegionAttributes {
	const resultObject: any = cloneDeep(regionInfo);

	Object.keys(resultObject).forEach((attr: string) => {
		// sos video does not support values in %
		if (XmlTags.cssElementsPosition.includes(attr) && resultObject[attr].indexOf('%') > 0) {
			switch (attr) {
				case 'width':
					resultObject.width = Math.floor(document.documentElement.clientWidth * parseInt(resultObject.width) / 100);
					break;
				case 'height':
					resultObject.height = Math.floor(document.documentElement.clientHeight * parseInt(resultObject.height) / 100);
					break;
				case 'left':
					resultObject.left = Math.floor(document.documentElement.clientWidth * parseInt(resultObject.left) / 100);
					break;
				case 'top':
					resultObject.top = Math.floor(document.documentElement.clientHeight * parseInt(resultObject.top) / 100);
					break;
				default:
				// unhandled attribute
			}
		}
	});

	return resultObject;
}

export function getRegionInfo(regionObject: RegionsObject, regionName: string): RegionAttributes {
	let regionInfo = <RegionAttributes> get(regionObject.region, regionName, regionObject.rootLayout);
	// unify regionName for further uses in code ( xml:id -> regionName )
	if (regionInfo.hasOwnProperty(XmlTags.regionNameAlias)) {
		regionInfo.regionName = <string> regionInfo[XmlTags.regionNameAlias];
		delete regionInfo[XmlTags.regionNameAlias];
	}

	regionInfo = fixVideoDimension(regionInfo);
	// fix nested regions and its values for dynamic use
	if (regionInfo.hasOwnProperty(SMILEnums.region)) {
		regionInfo = parseNestedRegions(regionInfo);
	}
	debug('Getting region info: %O for region name: %s', regionInfo, regionName);
	regionInfo = {
		...regionInfo,
		...(!isNil(regionInfo.top) && {top: parseInt(String(regionInfo.top))}),
		...(!isNil(regionInfo.left) && {left: parseInt(String(regionInfo.left))}),
		width: parseInt(String(regionInfo.width)),
		height: parseInt(String(regionInfo.height)),
	};
	return regionInfo;
}

/**
 * extracts additional css tag which are stored directly in video, image etc.. and not in regionInfo
 * @param value - represents SMIL media file object
 */
export function extractAdditionalInfo(value: SMILVideo | SMILAudio | SMILWidget | SMILImage):
	SMILVideo | SMILAudio | SMILWidget | SMILImage {
	// extract additional css info which are not specified in region tag.
	Object.keys(value).forEach((attr: string) => {
		if (XmlTags.additionalCssExtract.includes(attr)) {
			value.regionInfo[attr] = get(value, attr);
		}
	});

	return value;
}

// seq-6a985ce1ebe94055895763ce85e1dcaf93cd9620
export function generateParentId(tagName: string, value: any): string {
	try {
		return `${tagName}-${hash(value)}`;
	} catch (err) {
		// object-hash has bug when value is passed from inside unresolved promise ( happends when playlist is no longer active
		debug('Error during parent generation: %O', err);
		return `${tagName}-undefined`;
	}
}

export function getIndexOfPlayingMedia(currentlyPlaying: CurrentlyPlayingRegion[]): number {
	// no element was played before ( trigger case )
	if (isNil(currentlyPlaying)) {
		return 0;
	}
	return currentlyPlaying.findIndex((element) => {
		return (get(element, 'player.playing', false) === true);
	});
}

export function generateCurrentDate(utc: boolean) {
	if (utc) {
		return moment().utc();
	}
	return moment();
}

/**
 * finds index of nth occurrence of substring specified by count
 * @param string - t,est,
 * @param subString ,
 * @param count 2 = returns second index of ',' in string 't,est,'
 */
export function getPosition(string: string, subString: string, count: number) {
	return string.split(subString, count).join(subString).length;
}

export function removeDigits(expr: string): string {
	return expr.replace(/[0-9]/g, '');
}

export async function sleep(ms: number): Promise<object> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
