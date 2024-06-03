import fs from 'fs';
import path from 'path';

// Function to get all .md and .mdx files from a directory
const getMarkdownFiles = (dir: string, files?: string[]): string[] => {
  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    console.error(`Directory does not exist: ${dir}`);
    return [];
  }

  files = files || [];
  const filesInDirectory = fs.readdirSync(dir);

  for (const file of filesInDirectory) {
    const absolute = path.join(dir, file);
    // Skip API reference files
    if (
      absolute.includes('reference/typescript/apis') ||
      absolute.includes('reference/typescript/models') ||
      absolute.includes('reference/dart/apis') ||
      absolute.includes('reference/dart/models') ||
      absolute.includes('reference/kotlin/apis') ||
      absolute.includes('reference/kotlin/models') ||
      absolute.includes('reference/python/apis') ||
      absolute.includes('reference/python/models')
    ) {
      // console.log('skipping api reference file');
    } else if (fs.statSync(absolute).isDirectory()) {
      getMarkdownFiles(absolute, files);
    } else if (absolute.endsWith('.md') || absolute.endsWith('.mdx')) {
      files.push(absolute);
    }
  }
  return files;
};

// Function to encode file content to Base64
const encodeFileToBase64 = (filePath: string) => {
  const fileContent = fs.readFileSync(filePath);
  const metadataTitle = fileContent
    .toString()
    .split('\n')
    .find((line) => line.startsWith('title: '));

  if (!metadataTitle) {
    console.error('No metadata title found in file:', filePath);
    return;
  }

  return {
    title: metadataTitle.replace('title: ', ''),
    content: fileContent.toString('base64'),
    rawContent: fileContent.toString(),
    extension: path.extname(filePath).replace('.', ''),
  };
};

// Main function to process files
export const ingestDirectory = async (
  directory: string
): Promise<
  {
    title: string;
    content: string;
    rawContent: string;
    extension: string;
  }[]
> => {
  try {
    const markdownFiles = getMarkdownFiles(directory);
    const base64Strings = await Promise.all(
      markdownFiles.map(async (file) => {
        // console.log('Processing file:', file);
        const base64EncodedFile = encodeFileToBase64(file);

        if (!base64EncodedFile) {
          return;
        }

        return base64EncodedFile;
      })
    );

    // Remove all undefined values
    return base64Strings.filter((file) => file) as {
      title: string;
      content: string;
      rawContent: string;
      extension: string;
    }[];
  } catch (err) {
    console.error('Error processing files:', err);

    return [];
  }
};