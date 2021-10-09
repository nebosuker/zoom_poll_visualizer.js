/**
 * Zoomの投票レポートをビジュアライズするCustomElement
 */
class BanchoZoomPollVisualizer extends HTMLElement {

	// CSV parser library
	// PapaParse
	// https://github.com/mholt/PapaParse
	// https://www.papaparse.com/
	#csvParseLibraryUrl = 'https://cdn.jsdelivr.net/gh/mholt/PapaParse@5/papaparse.min.js';


	// Visualizer library
	// https://developers.google.com/chart/glossary
	#visualizerLibraryUrl = 'https://www.gstatic.com/charts/loader.js';


	// output display element
	#outputElem;
	// note display element (not using now?)
	#noteElem;

	// see initializeData()
	#csvData;
	#polls;
	#pollData;
	#csvFormat;
	#pollTitles2020;
	#pollResStartCol;

	// Zoom export formats
	#csvFormat2020 = 1;
	#csvFormat2021 = 2;


	// chart options
	#chartOptions = {
		'common' : {
		},
		'BarChart' : {
			legend: { position: "none" },
		},
		'PieChart' : {
		},
	};


  constructor() {
    // Always call super first in constructor
    super();

    // Element functionality written in here

		// Create a shadow root
		let shadowRoot = this.attachShadow({mode: 'open'});

		// Create elements
		const wrapperElem = document.createElement('div');
		wrapperElem.setAttribute('class', this.prefix('wrapper'));

		const fileLabelElem = wrapperElem.appendChild(
			document.createElement('label')
		);
		fileLabelElem.textContent = 'Zoomの投票レポートファイル';
		const fileInputElem = fileLabelElem.appendChild(
			document.createElement('input')
		);
		fileInputElem.setAttribute('type', 'file');
		fileInputElem.setAttribute('id', this.prefix('file'));
		fileInputElem.setAttribute('accept', '.csv');

		// 出力div
		const outputDiv = wrapperElem.appendChild(
			document.createElement('div')
		);
		outputDiv.setAttribute('id', this.prefix('output'));
		this.#outputElem = outputDiv;

		// 説明div
		const noteDiv = wrapperElem.appendChild(
			document.createElement('div')
		);
		noteDiv.setAttribute('id', this.prefix('note'));
		this.#noteElem = noteDiv;

		// external script
		const parseScriptElem = document.createElement('script');
		parseScriptElem.setAttribute('src', this.#csvParseLibraryUrl);
		wrapperElem.appendChild(parseScriptElem);
		// external script
		const visualizerScriptElem = document.createElement('script');
		visualizerScriptElem.setAttribute('src', this.#visualizerLibraryUrl);
		wrapperElem.appendChild(visualizerScriptElem);


		// CSS
		const styleElem = document.createElement('style');
		styleElem.textContent = this.getStyleCSS();

		// attach the created elements to the shadow DOM
		this.shadowRoot.append(styleElem,wrapperElem);
	}

	prefix = function(v) {
		return 'bancho-zoom-poll-visualizer-' + v;
	}

	getStyleCSS() {
		return `
* {
	box-sizing: border-box;
	max-width: 100%;
}
#${this.prefix('note')} ul li{
  margin-bottom: 0;
  list-style-type: disc;
}
label{
	display: block;
}
#${this.prefix('file')}{
	margin-left: .5em;
}
.bancho-zoom-poll-visualizer-chart-toc{
	margin: 2rem;
	font-size: .9rem;
}
.bancho-zoom-poll-visualizer-chart-toc-item{
	display: block;
}
.bancho-zoom-poll-visualizer-chart-toc-item--level-0{
}
.bancho-zoom-poll-visualizer-chart-toc-item--level-1{
	margin-left: 1em;
}
.bancho-zoom-poll-visualizer-group-wrapper{
	margin: 4rem 0;
}
.bancho-zoom-poll-visualizer-chart-wrapper{
	margin: 2rem 0;
	height: 60vh;
}
.flashOnce{
  animation: flash 1s linear;
}
@keyframes flash {
  0%,100% {
    opacity: 1;
  }

  50% {
    opacity: 0;
  }
}`;
	}

	connectedCallback() {
		const shadow = this.shadowRoot;

    const showError = (err) => {
	    if (!this.#outputElem) {
	    	alert("エラーが発生しました：\n" + err);
	    }
	    else {
	      this.#outputElem.innerHTML = '<div style="color:#f00; font-weight:bold; font-size: 1.2">エラーが発生しました<br>' + err + '</div>';
	    }
    }


		const processCsv = csvdata => {
			let state = 'initial';

			let lastRow = false;
			csvdata.forEach ((row) => {
				lastRow = row;
				switch (state) {

				case 'initial':
					if (row[0] == '#') {
						state = 'poll';
						initPolls(row);
						if (!this.#polls.length) {
							this.#csvFormat = this.#csvFormat2020;
						}
					}
					break;
			
				case 'poll':
					if (row[0] == '#') {
						appendPollData(row);
						initPolls(row);
					}
					else {
						processPollData(row);
					}
					break;
				}
			});
			appendPollData(lastRow);
//console.log(this.#pollData);
		}


		const initPolls = row => {
			this.#polls = [];
			let col = this.#pollResStartCol;
			while (row[col]) {
				let poll = getPollTemplate();
				poll.title = row[col];
				this.#polls.push(poll);
				col++;
			}
		}
		
		
		const getPollTemplate = () => {
			return {
				title : '',
				result : {},
				numResponse : 0,
				multiple : false,
			};
		}


		const appendPollData = (row) => {
			if (this.#polls && this.#polls.length) {
				this.#pollData.push(this.#polls);
			}
			initPolls(row);
		};


		const processPollData = (row) => {
console.log(this.#csvFormat);
			switch (this.#csvFormat) {
			case this.#csvFormat2020:
				processPollData2020(row);
				break;
			case this.#csvFormat2021:
				processPollData2021(row);
				break;
			default:
				throw 'unknown #csvFormat: ' + this.#csvFormat;
				break;
			}
		}

		const getPollIdFromPollTitle2020 = (pollTitle) => {
			let pollId = null;
			this.#pollTitles2020.some((title, key) => {
				if (pollTitle == title) {
					pollId = key;
					return true;
				}
			});
			if (pollId == null) {
				this.#pollTitles2020.push(pollTitle);
				pollId = getPollIdFromPollTitle2020(pollTitle);
				this.#polls[pollId] = getPollTemplate();
				this.#polls[pollId].title = pollTitle;
			}
			return pollId;
		}

		const processPollData2020 = (row) => {
			let pollTitle, responses;
			let pollId;
			
			pollTitle = row[this.#pollResStartCol];
			if (pollTitle) {
				pollId = getPollIdFromPollTitle2020(pollTitle);
				
				responses = row[this.#pollResStartCol + 1];
				if (!this.#polls[pollId].multiple && responses.match(/;/)) {
					this.#polls[pollId].multiple = true;
				}
				responses.split(';').forEach(res => {
					if ('undefined' == typeof(this.#polls[pollId].result[res])) {
						this.#polls[pollId].result[res] = 0;
					}
					this.#polls[pollId].result[res]++;
				})
				this.#polls[pollId].numResponse++;
			}
		}

		const processPollData2021 = (row) => {
			let responses;
			let pollId;
			let col = this.#pollResStartCol;
			while (row[col]) {
				pollId = col - this.#pollResStartCol;
				responses = row[col];
				if (
					!responses ||
					'undefined' == typeof(responses)
				) {
					continue;
				}
				if ('undefined' == typeof(this.#polls[pollId])) {
					this.#polls[pollId] = getPollTemplate();
				}
				if (!this.#polls[pollId].multiple && responses.match(/;/)) {
					this.#polls[pollId].multiple = true;
				}
				responses.split(';').forEach(res => {
					if ('undefined' == typeof(this.#polls[pollId].result[res])) {
						this.#polls[pollId].result[res] = 0;
					}
					this.#polls[pollId].result[res]++;
				})
				this.#polls[pollId].numResponse++;
				col++;
			}
		}


		const visualizePollData = pollData => {
//console.log(pollData);

			const wrapperElem = document.createElement('div');
			wrapperElem.setAttribute('class', this.prefix('result-wrapper'));
			this.#outputElem.appendChild(wrapperElem);

			const toc = [];

      pollData.forEach((polls, i) => {
      	const groupWrapperElem = document.createElement('section');
      	const groupId = i + 1;
      	const groupWrapperId = this.prefix(`group-wrapper-${groupId}`);
				groupWrapperElem.setAttribute('class', this.prefix('group-wrapper'));
				groupWrapperElem.setAttribute('id', groupWrapperId);
				wrapperElem.appendChild(groupWrapperElem);

				const groupHeaderElem = document.createElement('h2');
				const groupHeader = `投票 ${groupId}`;
				groupHeaderElem.textContent = groupHeader;
				groupWrapperElem.appendChild(groupHeaderElem);
				toc.push({
					level: 0,
					title: groupHeader,
					selector: `#${groupWrapperId}`,
				});

      	polls.forEach((poll, ii) => {
      		const chartId = this.prefix(`chart-wrapper-${groupId}-${ii}`);
	      	const chartWrapperElem = document.createElement('section');
					chartWrapperElem.setAttribute('class', this.prefix('chart-wrapper'));
					chartWrapperElem.setAttribute('id', chartId);
					groupWrapperElem.appendChild(chartWrapperElem);

					const data = new google.visualization.DataTable();
					data.addColumn('string', '選択肢');
					data.addColumn('number', '回答');
					Object.keys(poll.result).forEach(key => {
						data.addRow([key, poll.result[key]]);
					});
					data.sort([
						{column: 1, desc: true},
					]);

					const chartMethod = poll.multiple ? 'BarChart' : 'PieChart';
					const chartOptions = Object.assign(
						{},
						this.#chartOptions.common, 
						this.#chartOptions[chartMethod]
					);
					chartOptions.title = poll.title;
					toc.push({
						level: 1,
						title: poll.title,
						selector: `#${chartId}`,
					});
					const chart = new google.visualization[chartMethod](shadow.getElementById(chartId));
	        chart.draw(data, chartOptions);

      	});
      });
      
      if (toc.length) {
      	const tocWrapperElem = document.createElement('header');
				tocWrapperElem.setAttribute('class', this.prefix('chart-toc'));

	      toc.forEach(tocItem => {
	      	const tocItemElem = document.createElement('a');
	      	tocItemElem.classList.add(this.prefix('chart-toc-item'));
	      	tocItemElem.classList.add(this.prefix(`chart-toc-item--level-${tocItem.level}`));
	      	tocItemElem.setAttribute('href', tocItem.selector);
	      	tocItemElem.textContent = tocItem.title;
	      	tocWrapperElem.appendChild(tocItemElem);
	      });

				wrapperElem.insertBefore(tocWrapperElem, wrapperElem.childNodes[0]);
				// ページ内リンクが効かないので
				shadow.querySelectorAll(`.${this.prefix('chart-toc-item')}`).forEach(tocItem => {
					const tocItemLinkTarget = tocItem.getAttribute('href');
					if (tocItemLinkTarget.match(/^#/)) {
						tocItem.addEventListener('click', evt => {
							const targetElem = shadow.querySelector(tocItemLinkTarget);
							if (targetElem) {
								targetElem.scrollIntoView({
									behavior: 'smooth'
								});
							}
						});
					}
				});
      }
		}

		const initializeData = () => {
			// parsed CSV data
			this.#csvData = [];
			// processing polls data
			this.#polls = [];
			// processed data of array of polls
			this.#pollData = [];
			// Zoom export formats
			this.#csvFormat = this.#csvFormat2021;	// initialize
			// used when #csvFormat == #csvFormat2020
			this.#pollTitles2020 = [];
			// col number where poll result data starts
			this.#pollResStartCol = 4;
		}

	  const parseCsv = file => {
	  	initializeData();
			const reader = new FileReader()
			reader.readAsText(file)
			reader.onload = () => {
				const csvData = Papa.parse(reader.result, {});
				if (
					!csvData ||
					!csvData.data ||
					'undefined' == typeof(csvData.data) ||
					!csvData.data.length
				) {
					throw '[1] Could not parse csv.';
					return;
				}
//console.log(csvData);
				this.#csvData = csvData.data;
				processCsv(this.#csvData);

	      this.#outputElem.innerHTML = '';
	      google.charts.load('visualization', '1', {
	        'packages' : [ 'corechart' ],
		    });
		    google.charts.setOnLoadCallback(() => {
		    	visualizePollData(this.#pollData);
		    });;
				return true;
			}
	  };
		

	  const selectFile = evt => {
	    try{
				const files = evt.target.files;
//console.log(files);
				if (files[0].size) {
					parseCsv(files[0]);
				}
        this.#outputElem.innerHTML = '';
	    }
	    catch(err) {
console.log(err);
	      showError(err);
	    }
	  };
	  
	  shadow.getElementById(this.prefix('file'))
	  	.addEventListener('change', selectFile);
	}

}

if (!customElements.get('bancho-zoom-poll-visualizer')) {
	customElements.define(
		'bancho-zoom-poll-visualizer',
		BanchoZoomPollVisualizer
	);
}

