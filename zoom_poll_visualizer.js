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
	#outputElem = null;
	// note display element (not using now?)
	#noteElem = null;

	// parsed CSV data
	#csvData = [];
	// processed polls data
	#pollData = [];

	// col number where poll result data starts
	#pollResStartCol = 4;

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
			let polls = [];
			let lastRow = false;
			csvdata.forEach ((row) => {
				lastRow = row;
				switch (state) {

				case 'initial':
					if (row[0] == '#') {
						state = 'poll';
						polls = initPoll(row);
					}
					break;
			
				case 'poll':
					if (row[0] == '#') {
						appendPollData(polls, row);
						polls = initPoll(row);
					}
					else {
						polls = processPollData(row, polls);
					}
					break;
				}
			});
			appendPollData(polls, lastRow);
//console.log(this.#pollData);
		}


		const initPoll = row => {
			const polls = [];
			let col = this.#pollResStartCol;
			while (row[col]) {
				let poll = {};
				poll.title = row[col];
				poll.result = {};
				poll.numResponse = 0;
				poll.multiple = false;
				polls.push(poll);
				col++;
			}
			return polls;
		}


		const appendPollData = (polls, row) => {
			if (polls && polls.length) {
				Object.keys(polls).forEach(k => {
				});
				this.#pollData.push(polls);
			}
			polls = initPoll(row);
		};


		const processPollData = (row, polls) => {
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
				if (!polls[pollId].multiple && responses.match(/;/)) {
					polls[pollId].multiple = true;
				}
				responses.split(';').forEach(res => {
					if ('undefined' == typeof(polls[pollId].result[res])) {
						polls[pollId].result[res] = 0;
					}
					polls[pollId].result[res]++;
				})
				polls[pollId].numResponse++;
				col++;
			}
			return polls;
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


	  const parseCsv = file => {
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

