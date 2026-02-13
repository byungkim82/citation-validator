# APA Citation Libraries Research Report
Generated: 2026-02-13

## Executive Summary

This research identifies 15+ open-source libraries and tools for programmatic APA citation parsing, validation, and formatting. Key findings: **citation-js** (JavaScript, 0.7.22) and **citeproc-py** (Python) are the most mature CSL processors with APA support. **pybtex-apa7-style** provides dedicated APA 7th edition formatting. Machine learning-based parser **AnyStyle** offers style-agnostic citation extraction. CrossRef and OpenAlex APIs enable metadata-based validation for DOI-enabled citations.

---

## 1. Python Libraries

### 1.1 citeproc-py
**GitHub**: [citeproc-py/citeproc-py](https://github.com/citeproc-py/citeproc-py)  
**PyPI**: [citeproc-py](https://pypi.org/project/citeproc-py/)

**Capabilities**:
- ✅ CSL 1.0.1 processor implementation
- ✅ Parse: CSL-JSON input
- ✅ Format: Plain text, reStructuredText, HTML output
- ✅ APA support via CSL styles
- ⚠️ Note: Cannot achieve 100% APA compliance with built-in features alone

**Installation**:
```bash
pip install citeproc-py
```

**Python Support**: 3.9+

**Last Activity**: Active (official CSL processor)

**APA 7th Edition**: Partial (via CSL style files, with known limitations)

---

### 1.2 pybtex + pybtex-apa7-style
**GitHub**: 
- Core: [pybtex.org](https://pybtex.org/)
- APA7 plugin: [caltechlibrary/pybtex-apa7-style](https://github.com/caltechlibrary/pybtex-apa7-style)

**PyPI**: 
- [pybtex](https://pypi.org/project/pybtex/)
- [pybtex-apa7-style](https://pypi.org/project/pybtex-apa7-style/)

**Capabilities**:
- ✅ Parse: BibTeX files
- ✅ Format: LaTeX, Markdown, HTML, plain text
- ✅ APA 7th edition via plugin
- ⚠️ Note: APA style has "endless edge cases" per maintainers

**Installation**:
```bash
pip install pybtex pybtex-apa7-style
```

**Python Support**: 3.x

**Last Activity**: Active (Caltech Library maintains APA7 plugin)

**APA 7th Edition**: ✅ Yes (dedicated plugin)

---

### 1.3 refextract
**GitHub**: [inspirehep/refextract](https://github.com/inspirehep/refextract)  
**PyPI**: [refextract](https://pypi.org/project/refextract/)

**Capabilities**:
- ✅ Extract references from PDF files, URLs, text strings
- ✅ Parse journal reference structures
- ❌ Validation: No APA-specific validation
- ❌ Formatting: No APA formatting (extraction only)

**Installation**:
```bash
pip install refextract
```

**Python Support**: >=3.11, <4

**Last Activity**: October 2025 release

**APA 7th Edition**: N/A (extraction tool, not formatter)

**Use Case**: High-Energy Physics literature, maintained by INSPIRE-HEP

---

### 1.4 pyapa
**GitHub**: [keeferrourke/pyapa](https://github.com/keeferrourke/pyapa)

**Capabilities**:
- ✅ Validation: Check APA style compliance in writing
- ❌ Parsing: No
- ❌ Formatting: No

**Installation**: Clone from GitHub

**Last Activity**: Check repository for updates

**APA 7th Edition**: Unclear (check repository)

---

### 1.5 python-autocite
**GitHub**: [thenaterhood/python-autocite](https://github.com/thenaterhood/python-autocite)

**Capabilities**:
- ✅ Generate citations from URLs
- ✅ Currently supports APA (extensible)
- ❌ Parsing: No (generation only)

**Installation**: Clone from GitHub

**Last Activity**: Check repository for updates

**APA 7th Edition**: Supports APA (version unclear)

---

### 1.6 APA-Toolkit
**GitHub**: [LYK-love/APA-Toolkit](https://github.com/LYK-love/APA-Toolkit)

**Capabilities**:
- ✅ Create and check APA citations
- ✅ Python toolkit for scientific writing

**Installation**: Clone from GitHub

**Last Activity**: Check repository for updates

**APA 7th Edition**: Check repository documentation

---

## 2. JavaScript/Node.js Libraries

### 2.1 citation-js ⭐ RECOMMENDED
**GitHub**: [citation-js/citation-js](https://github.com/citation-js/citation-js)  
**npm**: [citation-js](https://www.npmjs.com/package/citation-js)  
**Website**: [citation.js.org](https://citation.js.org/)

**Capabilities**:
- ✅ Parse: BibTeX, RIS, DOI, Wikidata JSON, BibJSON, ContentMine JSON
- ✅ Format: APA, Vancouver, CSL templates
- ✅ Output: HTML, plain text
- ✅ CLI tool available
- ✅ Async API for DOI/URL/Wikidata input

**Installation**:
```bash
npm install citation-js
```

**Latest Version**: 0.7.22 (published February 2026)

**Last Activity**: Actively maintained (2-day-old release)

**APA 7th Edition**: Supports APA via CSL (specific edition unclear from docs)

**Plugin Ecosystem**:
- `@citation-js/plugin-csl` - CSL output generation
- `@citation-js/plugin-bibtex` - BibTeX I/O
- `@citation-js/plugin-quickstatements` - Wikidata support

**Usage Example**:
```javascript
const Cite = require('citation-js');
const data = await Cite.async('10.1234/example.doi');
const output = data.format('bibliography', {
  format: 'html',
  template: 'apa',
  lang: 'en-US'
});
```

---

### 2.2 citeproc-js
**GitHub**: [Juris-M/citeproc-js](https://github.com/Juris-M/citeproc-js)  
**Docs**: [citeproc-js.readthedocs.io](https://citeproc-js.readthedocs.io/)  
**npm**: `citeproc-plus` (bundled version)

**Capabilities**:
- ✅ Full CSL processor implementation
- ✅ Format: APA and all CSL styles
- ✅ Used by Zotero, Mendeley, Qiqqa

**Installation**:
```bash
# Via git
git clone --recursive https://github.com/Juris-M/citeproc-js.git

# Via npm (bundled with styles + locales)
npm install citeproc-plus --save
```

**Files**:
- `citeproc_commonjs.js` - ES6 module (recommended)
- `citeproc.js` - Raw JavaScript bundle

**Last Activity**: Active (version 1.1.73 documented)

**APA 7th Edition**: Via CSL style files

---

## 3. CSL (Citation Style Language)

### 3.1 Official APA 7th Edition CSL File
**Source**: [Citation Style Language Styles Repository](https://github.com/citation-style-language/styles)  
**Direct Link**: [apa.csl](https://github.com/citation-style-language/styles/blob/master/apa.csl)  
**Distribution**: [styles-distribution/apa.csl](https://github.com/citation-style-language/styles-distribution/blob/master/apa.csl)

**Last Updated**: 2026-02-07 (per search results)

**Specification**: CSL 1.0.2

**Usage**: Compatible with all CSL processors (citeproc-py, citeproc-js, citation-js, etc.)

**Download**:
```bash
wget https://raw.githubusercontent.com/citation-style-language/styles/master/apa.csl
```

**Integration**:
- Zotero: Double-click .csl file to install
- Manual: Place in CSL processor's style directory

---

### 3.2 CSL Ecosystem
**Website**: [citationstyles.org](https://citationstyles.org/)  
**Styles Repository**: 10,000+ free CSL citation styles  
**Editor**: [editor.citationstyles.org](https://editor.citationstyles.org/)

**Processors**:
| Language | Library | Repo |
|----------|---------|------|
| Python | citeproc-py | [citeproc-py/citeproc-py](https://github.com/citeproc-py/citeproc-py) |
| JavaScript | citeproc-js | [Juris-M/citeproc-js](https://github.com/Juris-M/citeproc-js) |
| Ruby | citeproc-ruby | [inukshuk/citeproc-ruby](https://github.com/inukshuk/citeproc-ruby) |
| Lua | citeproc-lua | [ctan.org](https://ctan.org/pkg/citation-style-language) |

---

## 4. Machine Learning-Based Tools

### 4.1 AnyStyle
**GitHub**: [inukshuk/anystyle](https://github.com/inukshuk/anystyle)  
**Website**: [anystyle.io](https://anystyle.io/)  
**Ruby Gem**: [anystyle-parser](https://rubygems.org/gems/anystyle-parser)

**Capabilities**:
- ✅ Parse: Style-agnostic citation extraction
- ✅ Machine Learning: Conditional Random Fields (CRF)
- ✅ Train custom models with your data
- ✅ Token editor for improving accuracy
- ✅ Web interface and CLI

**Technology**:
- Wapiti-based CRFs
- Kyoto Cabinet or Redis for key-value storage

**Installation**:
```bash
gem install anystyle-cli
```

**Last Activity**: Active (maintained by inukshuk)

**APA 7th Edition**: Style-agnostic (parses any citation style into structured data)

**Use Case**: When citation style is unknown or mixed, or when training on domain-specific data

---

## 5. GitHub Projects

### 5.1 APACheck
**GitHub**: [JonathanAquino/apacheck](https://github.com/JonathanAquino/apacheck)  
**Website**: [jonathanaquino.com/apacheck](http://jonathanaquino.com/apacheck/)

**Capabilities**:
- ✅ Validation: APA format compliance checker
- ✅ Miscellaneous APA style checks
- ❌ Parsing: No
- ❌ Formatting: No

**Installation**: Web-based tool or clone repository

**Last Activity**: Check repository

**GitHub Stars**: Not provided in search results

---

### 5.2 Citation Builder
**GitHub**: [phpforfree/citationbuilder](https://github.com/phpforfree/citationbuilder)

**Capabilities**:
- ✅ Generate citations for books, articles, websites
- ✅ APA and MLA formats
- ✅ Web-based interface
- ❌ Parsing: No (generation only)

**Installation**: Web application (PHP-based)

**Last Activity**: Check repository

---

### 5.3 APA-Formatter (PowerShell)
**GitHub**: [GigaNerdTech/apa-formatter](https://github.com/GigaNerdTech/apa-formatter)

**Capabilities**:
- ✅ Format research papers in APA style
- ❌ Citations: No (paper formatting, not references)

**Installation**: PowerShell script

**Last Activity**: Check repository

---

## 6. API Services for Metadata Validation

### 6.1 CrossRef REST API ⭐ RECOMMENDED
**Website**: [crossref.org](https://www.crossref.org/documentation/retrieve-metadata/rest-api/)  
**GitHub**: [CrossRef/rest-api-doc](https://github.com/CrossRef/rest-api-doc)  
**API Docs**: [REST API format](https://github.com/CrossRef/rest-api-doc/blob/master/api_format.md)

**Capabilities**:
- ✅ Retrieve citation metadata by DOI
- ✅ Validate DOI existence and accuracy
- ✅ Match reference metadata to DOIs
- ✅ Query works, journals, members, funders
- ✅ Filter by ORCID, references, licenses

**Access**: Free, no API key required (rate limits apply)

**Usage Example**:
```bash
# Get metadata for DOI
curl https://api.crossref.org/works/10.1037/0003-066X.59.1.29

# Validate DOI
curl https://doi.org/10.1037/0003-066X.59.1.29
```

**Citation Validation**:
- Check if DOI is valid (200 response)
- Retrieve canonical metadata for comparison
- Match unstructured references to DOIs

**Rate Limits**: 
- Polite pool (50 requests/sec): Include `mailto:` in User-Agent
- Anonymous (unlimited but slower)

---

### 6.2 OpenAlex API
**Website**: [openalex.org](https://docs.openalex.org/)  
**API Docs**: [docs.openalex.org/how-to-use-the-api/api-overview](https://docs.openalex.org/how-to-use-the-api/api-overview)

**Capabilities**:
- ✅ 240M+ scholarly works indexed
- ✅ Retrieve citation metadata (authors, institutions, topics)
- ✅ Citation graph: `referenced_works`, `cited_by_count`
- ✅ Filter by publication date, venue, author
- ✅ Free API (requires free API key)

**Access**: Free with API key

**Usage Example**:
```bash
# Get work by DOI
curl "https://api.openalex.org/works/https://doi.org/10.1037/0003-066X.59.1.29"

# Get citing works
curl "https://api.openalex.org/works?filter=cites:W2741809807"
```

**Data Sources**:
- CrossRef, PubMed, arXiv
- Institutional repositories
- Former Microsoft Academic Graph (MAG)

**Deduplication**: Automatic merging of duplicate works

**Update Frequency**: ~50,000 works added daily

---

### 6.3 DOI.org Resolution API
**Website**: [doi.org](https://www.doi.org/)

**Capabilities**:
- ✅ Validate DOI resolution
- ✅ Retrieve registration agency (CrossRef, DataCite, etc.)
- ❌ Limited metadata (redirects to publisher)

**Usage**:
```bash
# Check DOI validity
curl -I https://doi.org/10.1037/0003-066X.59.1.29
```

**Use Case**: Quick DOI validation without full metadata retrieval

---

## 7. Comparison Matrix

### Feature Comparison

| Library | Language | Parse | Validate | Format | APA 7th | Last Update |
|---------|----------|-------|----------|--------|---------|-------------|
| **citation-js** | JavaScript | ✅ | ❌ | ✅ | ⚠️ | Feb 2026 |
| **citeproc-py** | Python | ✅ | ❌ | ✅ | ⚠️ | Active |
| **pybtex-apa7-style** | Python | ✅ | ❌ | ✅ | ✅ | Active |
| **citeproc-js** | JavaScript | ✅ | ❌ | ✅ | ⚠️ | Active |
| **AnyStyle** | Ruby | ✅ | ❌ | ❌ | N/A | Active |
| **refextract** | Python | ✅ | ❌ | ❌ | N/A | Oct 2025 |
| **pyapa** | Python | ❌ | ✅ | ❌ | ? | Check repo |
| **APACheck** | Web | ❌ | ✅ | ❌ | ? | Check repo |
| **CrossRef API** | API | N/A | ✅ | ❌ | N/A | Live |
| **OpenAlex API** | API | N/A | ✅ | ❌ | N/A | Live |

**Legend**:
- ✅ = Full support
- ⚠️ = Via CSL (not APA 7th-specific)
- ❌ = Not supported
- ? = Unknown/check repository

---

## 8. Recommended Stacks

### Stack 1: JavaScript/TypeScript Project
```bash
npm install citation-js
```
**Use**: citation-js for parsing + formatting with APA template

**Validation**: CrossRef API for DOI-based citations

---

### Stack 2: Python Project (BibTeX workflow)
```bash
pip install pybtex pybtex-apa7-style
```
**Use**: pybtex for parsing BibTeX → pybtex-apa7-style for APA 7th formatting

**Validation**: Manual comparison or custom validators

---

### Stack 3: Python Project (CSL workflow)
```bash
pip install citeproc-py
```
**Download**: [apa.csl](https://github.com/citation-style-language/styles/blob/master/apa.csl)

**Use**: citeproc-py + official APA CSL file

**Validation**: CrossRef/OpenAlex API

---

### Stack 4: Style-Agnostic Extraction
```bash
gem install anystyle-cli
```
**Use**: AnyStyle for parsing unknown citation styles

**Post-processing**: Convert to CSL-JSON → format with citation-js or citeproc-py

---

## 9. Limitations and Gaps

### Known Issues:

1. **APA 7th Edition Compliance**: 
   - No library achieves 100% APA 7th compliance programmatically
   - CSL files approximate APA but have known edge cases
   - pybtex-apa7-style maintainers note "endless edge cases"

2. **Validation Tools**:
   - Few libraries offer built-in APA validation
   - Most focus on parsing/formatting, not compliance checking
   - Validation requires external tools (APACheck) or manual review

3. **Field-Level Validation**:
   - No library validates individual field requirements (e.g., DOI format, author name order)
   - Would require custom validators built on top of parsers

4. **Citation Type Coverage**:
   - Some types (social media, datasets, gray literature) poorly supported
   - APA 7th introduced new types not fully covered by older libraries

### Gap Analysis:

**Missing**: 
- ❌ Comprehensive APA 7th field-level validator
- ❌ Python library with 100% APA 7th formatting accuracy
- ❌ Real-time validation API service

**Workarounds**:
- Combine multiple tools (parser + validator + formatter)
- Use CrossRef/OpenAlex for metadata enrichment
- Manual review for edge cases

---

## 10. Installation Quick Reference

### Python
```bash
# CSL processor
pip install citeproc-py

# BibTeX + APA7
pip install pybtex pybtex-apa7-style

# Citation extraction
pip install refextract

# URL-to-citation
pip install git+https://github.com/thenaterhood/python-autocite
```

### JavaScript/Node.js
```bash
# Recommended: citation-js
npm install citation-js

# CSL processor bundle
npm install citeproc-plus

# Individual plugins
npm install @citation-js/core @citation-js/plugin-csl
```

### Ruby
```bash
# Machine learning parser
gem install anystyle-cli
```

### CSL Styles
```bash
# Download APA 7th edition CSL
wget https://raw.githubusercontent.com/citation-style-language/styles/master/apa.csl
```

---

## 11. Key Takeaways

### For Parsing:
- **JavaScript**: citation-js (actively maintained, 0.7.22)
- **Python**: citeproc-py (CSL) or pybtex (BibTeX)
- **Style-agnostic**: AnyStyle (machine learning)

### For Formatting:
- **APA 7th specific**: pybtex-apa7-style (Python)
- **General CSL**: citation-js, citeproc-py, citeproc-js + apa.csl

### For Validation:
- **DOI-based**: CrossRef API, OpenAlex API
- **Format checking**: APACheck (web), pyapa (Python)
- **Custom**: Build validators on top of parsers

### For Metadata Enrichment:
- **CrossRef API**: 50 req/sec with polite pool
- **OpenAlex API**: 240M works, free with API key
- **DOI.org**: Quick resolution checks

---

## Sources

- [citation-js GitHub](https://github.com/citation-js/citation-js)
- [citeproc-py GitHub](https://github.com/citeproc-py/citeproc-py)
- [pybtex-apa7-style GitHub](https://github.com/caltechlibrary/pybtex-apa7-style)
- [AnyStyle GitHub](https://github.com/inukshuk/anystyle)
- [refextract GitHub](https://github.com/inspirehep/refextract)
- [Citation Style Language Styles](https://github.com/citation-style-language/styles)
- [CrossRef REST API](https://www.crossref.org/documentation/retrieve-metadata/rest-api/)
- [OpenAlex Documentation](https://docs.openalex.org/)
- [APACheck GitHub](https://github.com/JonathanAquino/apacheck)
- [citeproc-js GitHub](https://github.com/Juris-M/citeproc-js)

---

*Generated by Scientist Agent*
