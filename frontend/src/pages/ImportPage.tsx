import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { importApi } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Upload, CheckCircle, AlertCircle, Loader2, FileText } from 'lucide-react';
import { useToast } from '../components/ui/use-toast';

export function ImportPage() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);

  const importMutation = useMutation({
    mutationFn: (file: File) => importApi.importTSV(file),
    onSuccess: (data) => {
      setImportResult(data.data);
      toast({
        title: 'Import Successful',
        description: `Imported ${data.data.imported} new requests, updated ${data.data.updated} existing requests.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Import Failed',
        description: error?.response?.data?.error || error.message,
        variant: 'destructive',
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.tsv') && !file.name.endsWith('.txt')) {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a TSV (Tab-Separated Values) file.',
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = () => {
    if (!selectedFile) {
      toast({
        title: 'No File Selected',
        description: 'Please select a TSV file to import.',
        variant: 'destructive',
      });
      return;
    }
    importMutation.mutate(selectedFile);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import Requests Data</h1>
        <p className="text-muted-foreground mt-2">
          Upload a TSV (Tab-Separated Values) file to import request data into the system
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload TSV File</CardTitle>
          <CardDescription>
            Select a TSV file containing request data. The file should have a header row with column names.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".tsv,.txt"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-4"
            >
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div>
                <span className="text-sm font-medium text-primary hover:underline">
                  Click to upload
                </span>
                {' '}or drag and drop
              </div>
              <p className="text-xs text-muted-foreground">
                TSV files only (Max 50MB)
              </p>
            </label>
          </div>

          {selectedFile && (
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedFile(null);
                  setImportResult(null);
                }}
              >
                Remove
              </Button>
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={!selectedFile || importMutation.isPending}
            className="w-full"
            size="lg"
          >
            {importMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.errors > 0 ? (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="text-sm text-muted-foreground">New Requests</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {importResult.imported}
                </p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-sm text-muted-foreground">Updated Requests</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {importResult.updated}
                </p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                <p className="text-sm text-muted-foreground">Errors</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {importResult.errors}
                </p>
              </div>
            </div>
            {importResult.errors > 0 && importResult.errorDetails && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <p className="text-sm font-medium mb-2">Error Details (first 10):</p>
                <ul className="text-sm space-y-1">
                  {importResult.errorDetails.map((err: any, idx: number) => (
                    <li key={idx}>
                      Row {err.row}: {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

