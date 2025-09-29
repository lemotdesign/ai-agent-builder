import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, BookOpen, FileText, Github, MessageSquare, Search, Send, Sparkles, Eye, Upload, RefreshCw, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface GitHubConnection {
  id: number;
  repositoryName: string;
  repositoryOwner: string;
  repositoryUrl: string;
  defaultBranch: string;
  isActive: boolean;
  lastSync: string;
}

interface HugoContentFile {
  name: string;
  path: string;
  type: string;
  size: number;
  sha: string;
  frontMatter: any;
  body: string;
  contentType: string;
  editableFields: Array<{
    path: string;
    type: string;
    value: string;
    editable: boolean;
  }>;
}

interface ContentPreview {
  success: boolean;
  preview: {
    originalContent: string;
    originalFields: any[];
    modifiedFields: any[];
    fullDiff: { added: string[]; removed: string[] };
    appliedPatches: Array<{ path: string; value: string; operation: string }>;
    editableFields: any[];
    contentType: string;
    spyfuInsights?: any;
  };
  errors: string[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export default function ContentStudio() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedConnection, setSelectedConnection] = useState<GitHubConnection | null>(null);
  const [selectedFile, setSelectedFile] = useState<HugoContentFile | null>(null);
  const [hugoContent, setHugoContent] = useState<HugoContentFile[]>([]);
  const [currentPreview, setCurrentPreview] = useState<ContentPreview | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [targetKeywords, setTargetKeywords] = useState("");
  const [competitorDomain, setCompetitorDomain] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isEditingField, setIsEditingField] = useState<string | null>(null);
  const [fieldEdits, setFieldEdits] = useState<Record<string, string>>({});
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch GitHub connections
  const { data: githubConnections = [], isLoading: loadingConnections, refetch: refetchConnections } = useQuery({
    queryKey: ["/api/content-publishing/github/connections"],
  });

  // Fetch Hugo content for selected connection
  const { data: hugoContentData, isLoading: loadingContent } = useQuery({
    queryKey: ["/api/content-publishing/repo", selectedConnection?.id, "content/tree"],
    queryFn: () => apiRequest("GET", `/api/content-publishing/repo/${selectedConnection?.id}/content/tree`),
    enabled: !!selectedConnection,
  });

  // Fetch specific file content
  const { data: fileContentData, isLoading: loadingFile } = useQuery({
    queryKey: ["/api/content-publishing/repo", selectedConnection?.id, "content/file", selectedFile?.path],
    queryFn: () => apiRequest("GET", `/api/content-publishing/repo/${selectedConnection?.id}/content/file?path=${encodeURIComponent(selectedFile?.path || "")}`),
    enabled: !!selectedConnection && !!selectedFile,
  });

  // Update Hugo content state when data loads
  useEffect(() => {
    if (hugoContentData) {
      // Handle different response shapes from server
      const content = Array.isArray(hugoContentData) ? hugoContentData : 
                     (hugoContentData as any)?.content || (hugoContentData as any)?.data || [];
      setHugoContent(content);
    }
  }, [hugoContentData]);

  // Update selected file when file data loads
  useEffect(() => {
    if (fileContentData) {
      // Handle different response shapes from server
      const fileData = (fileContentData as any)?.file || (fileContentData as any)?.data || fileContentData;
      if (fileData && fileData.editableFields) {
        setSelectedFile(prev => prev ? { ...prev, ...fileData } : fileData);
      }
    }
  }, [fileContentData]);

  // Preview content changes with AI
  const previewMutation = useMutation({
    mutationFn: async (data: { 
      filePath: string; 
      patches?: any[]; 
      prompt?: string;
      generateContent?: boolean; 
      useSpyFu?: boolean; 
      targetKeywords?: string[]; 
      competitorDomain?: string; 
    }) => {
      const response = await apiRequest("POST", `/api/content-publishing/repo/${selectedConnection?.id}/content/preview`, data);
      return await response.json() as ContentPreview;
    },
    onSuccess: (data: ContentPreview) => {
      setCurrentPreview(data);
      setChatMessages(prev => [
        ...prev,
        { role: "user", content: chatMessage, timestamp: new Date().toISOString() },
        { 
          role: "assistant", 
          content: data.success 
            ? `I've generated content improvements with ${data.preview.appliedPatches.length} changes. Review the diff below and click Apply to save to your repository.`
            : `I encountered some issues: ${data.errors.join(", ")}`,
          timestamp: new Date().toISOString() 
        }
      ]);
      setChatMessage("");
    },
  });

  // Apply content changes
  const applyMutation = useMutation({
    mutationFn: async (data: { filePath: string; patches: any[]; commitMessage: string }) => {
      const response = await apiRequest("POST", `/api/content-publishing/repo/${selectedConnection?.id}/content/apply`, data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Content Updated",
        description: "Changes have been committed to your repository!",
      });
      setCurrentPreview(null);
      setFieldEdits({});
      // Refresh file content and Hugo content
      queryClient.invalidateQueries({ queryKey: ["/api/content-publishing/repo", selectedConnection?.id] });
      // Refresh the selected file
      if (selectedFile) {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/content-publishing/repo", selectedConnection?.id, "content/file", selectedFile.path] 
        });
      }
    },
  });

  // Domain analysis mutation
  const domainAnalysisMutation = useMutation({
    mutationFn: async (domain: string) => {
      const response = await apiRequest("POST", "/api/content-publishing/seo/analyze-domain", { domain });
      return await response.json();
    },
  });

  const handleSendMessage = () => {
    if (!chatMessage.trim() || !selectedFile || !selectedConnection) return;

    // Create patches from current field edits
    const patches = Object.entries(fieldEdits).map(([path, value]) => ({
      path,
      value,
      operation: "replace"
    }));

    previewMutation.mutate({
      filePath: selectedFile.path,
      patches: patches.length > 0 ? patches : undefined,
      prompt: chatMessage, // Send the actual user message to AI
      generateContent: chatMessage.includes("improve") || chatMessage.includes("optimize"),
      useSpyFu: !!competitorDomain,
      targetKeywords: targetKeywords ? targetKeywords.split(",").map(k => k.trim()) : undefined,
      competitorDomain: competitorDomain || undefined,
    });
  };

  const handleApplyChanges = () => {
    if (!currentPreview || !selectedFile || !selectedConnection) return;

    applyMutation.mutate({
      filePath: selectedFile.path,
      patches: currentPreview.preview.appliedPatches,
      commitMessage: `Update ${selectedFile.name} via AI Agent Builder`
    });
  };

  const handleFieldEdit = (path: string, value: string) => {
    setFieldEdits(prev => ({ ...prev, [path]: value }));
  };

  const connectGitHub = async () => {
    try {
      // Get GitHub auth URL and redirect
      const response = await apiRequest("GET", "/api/content-publishing/github/auth-url");
      const data = await response.json();
      
      if (data && data.authUrl) {
        // Open GitHub OAuth in a popup
        const popup = window.open(data.authUrl, "github-auth", "width=600,height=700");
        
        // Listen for messages from the popup
        const handleMessage = (event: MessageEvent) => {
          // Validate origin and source for security
          if (event.origin !== window.location.origin || event.source !== popup) {
            return;
          }
          
          if (event.data?.type === 'github_auth_success') {
            toast({
              title: "Repository Connected",
              description: "GitHub repository has been successfully connected!",
            });
            // Refresh connections
            queryClient.invalidateQueries({ queryKey: ["/api/content-publishing/github/connections"] });
            window.removeEventListener('message', handleMessage);
            popup?.close(); // Close the popup on success
          }
        };
        
        window.addEventListener('message', handleMessage);
        
        // Cleanup if popup is closed manually
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
          }
        }, 1000);
        
      } else {
        throw new Error("Failed to get GitHub authorization URL");
      }
    } catch (error) {
      console.error("GitHub connection error:", error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to GitHub. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Content Studio
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Create, optimize, and publish SEO-driven content with AI assistance
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Create
            </TabsTrigger>
            <TabsTrigger value="editor" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              AI Editor
            </TabsTrigger>
            <TabsTrigger value="publish" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Publish
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* GitHub Connections */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Github className="h-5 w-5" />
                      GitHub Connections
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => refetchConnections()}
                      disabled={loadingConnections}
                      data-testid="button-refresh-connections"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Connected repositories for content publishing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingConnections ? (
                    <div className="text-center py-4">Loading...</div>
                  ) : Array.isArray(githubConnections) && githubConnections.length > 0 ? (
                    <div className="space-y-3">
                      {(githubConnections as GitHubConnection[]).map((conn: GitHubConnection) => (
                        <div key={conn.id} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium">{conn.repositoryName}</div>
                              <div className="text-sm text-muted-foreground">
                                {conn.repositoryOwner}
                              </div>
                              <Badge variant={conn.isActive ? "default" : "secondary"} className="mt-2">
                                {conn.isActive ? "Active" : "Disconnected"}
                              </Badge>
                            </div>
                            {!conn.isActive && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  // Remove from local state for immediate UI update
                                  queryClient.setQueryData(["/api/content-publishing/github/connections"], 
                                    (oldData: any) => oldData?.filter((c: any) => c.id !== conn.id) || []
                                  );
                                  toast({
                                    title: "Connection Removed",
                                    description: "Disconnected repository has been removed.",
                                  });
                                }}
                                data-testid={`button-remove-connection-${conn.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Github className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">No GitHub repositories connected</p>
                      <Button onClick={connectGitHub} size="sm">
                        Connect Repository
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Content Pieces */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Content Library
                  </CardTitle>
                  <CardDescription>
                    Your content pieces and drafts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingContent ? (
                    <div className="text-center py-4">Loading...</div>
                  ) : hugoContent && hugoContent.length > 0 ? (
                    <div className="space-y-3">
                      {hugoContent.map((file: HugoContentFile) => (
                        <div 
                          key={file.path} 
                          className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            setSelectedFile(file);
                            setActiveTab("editor");
                          }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium">{file.frontMatter?.title || file.name}</h3>
                            <Badge variant={file.contentType === "blog" ? "default" : "secondary"}>
                              {file.contentType}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {file.body?.substring(0, 150)}...
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{file.editableFields?.length || 0} editable fields</span>
                            <span>•</span>
                            <span>{file.path}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : selectedConnection ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">No Hugo content found in this repository</p>
                      <p className="text-xs text-muted-foreground">
                        Connect a repository with Hugo content in the 'content' folder
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Github className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">Select a GitHub repository to view content</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="create" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Github className="h-5 w-5" />
                    Repository Selection
                  </CardTitle>
                  <CardDescription>
                    Choose a GitHub repository to work with Hugo content
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Array.isArray(githubConnections) && githubConnections.length > 0 ? (
                    <div className="space-y-3">
                      {(githubConnections as GitHubConnection[]).map((conn: GitHubConnection) => (
                        <div 
                          key={conn.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedConnection?.id === conn.id 
                              ? "bg-primary/10 border-primary" 
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => setSelectedConnection(conn)}
                        >
                          <div className="font-medium">{conn.repositoryName}</div>
                          <div className="text-sm text-muted-foreground">
                            {conn.repositoryOwner}
                          </div>
                          <Badge variant={conn.isActive ? "default" : "secondary"} className="mt-2">
                            {conn.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Github className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">No GitHub repositories connected</p>
                      <Button onClick={connectGitHub} size="sm">
                        Connect Repository
                      </Button>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div>
                    <Label htmlFor="keywords">Target Keywords (for AI optimization)</Label>
                    <Input
                      id="keywords"
                      data-testid="input-keywords"
                      value={targetKeywords}
                      onChange={(e) => setTargetKeywords(e.target.value)}
                      placeholder="seo optimization, content marketing, hugo cms"
                    />
                  </div>

                  <div>
                    <Label htmlFor="competitor">Competitor Domain (for SpyFu analysis)</Label>
                    <Input
                      id="competitor"
                      data-testid="input-competitor"
                      value={competitorDomain}
                      onChange={(e) => setCompetitorDomain(e.target.value)}
                      placeholder="competitor.com"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    SEO Analysis
                  </CardTitle>
                  <CardDescription>
                    Analyze competitor domains for keyword insights
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {domainAnalysisMutation.data && (
                    <div className="space-y-3">
                      <div className="p-3 bg-muted rounded-lg">
                        <h4 className="font-medium mb-2">Domain: {(domainAnalysisMutation.data as any).domain}</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Organic Keywords:</span>
                            <div className="font-medium">{(domainAnalysisMutation.data as any).summary?.organicKeywords || 0}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Organic Traffic:</span>
                            <div className="font-medium">{(domainAnalysisMutation.data as any).summary?.organicTraffic || 0}</div>
                          </div>
                        </div>
                      </div>
                      
                      {(domainAnalysisMutation.data as any).topKeywords?.length > 0 && (
                        <div>
                          <h5 className="font-medium mb-2">Top Keywords</h5>
                          <div className="space-y-1">
                            {(domainAnalysisMutation.data as any).topKeywords.slice(0, 5).map((keyword: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span>{keyword.keyword}</span>
                                <span className="text-muted-foreground">Pos: {keyword.position}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <Button 
                    onClick={() => competitorDomain && domainAnalysisMutation.mutate(competitorDomain)}
                    disabled={!competitorDomain || domainAnalysisMutation.isPending}
                    variant="outline"
                    className="w-full"
                  >
                    {domainAnalysisMutation.isPending ? "Analyzing..." : "Analyze Domain"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="editor" className="space-y-6">
            {selectedFile ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Editable Fields */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Editable Fields
                    </CardTitle>
                    <CardDescription>
                      Edit content while preserving Hugo/Bookshop structure
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-96">
                      <div className="space-y-4">
                        {loadingFile ? (
                          <div className="text-center py-4">Loading file...</div>
                        ) : selectedFile?.editableFields?.length > 0 ? (
                          selectedFile.editableFields.map((field, idx) => (
                            <div key={idx} className="space-y-2">
                              <Label className="text-xs font-medium">{field.path}</Label>
                              <Textarea
                                data-testid={`field-${field.path}`}
                                value={fieldEdits[field.path] || field.value}
                                onChange={(e) => handleFieldEdit(field.path, e.target.value)}
                                className="text-sm min-h-[80px]"
                                placeholder={`Edit ${field.type}...`}
                              />
                              <Badge variant="outline" className="text-xs">
                                {field.type}
                              </Badge>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-muted-foreground text-sm">
                              No editable fields found in this file
                            </p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Chat Interface */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      AI Assistant
                    </CardTitle>
                    <CardDescription>
                      Chat with AI to optimize your Hugo content
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-80 mb-4 border rounded-lg p-4">
                      <div className="space-y-4">
                        {chatMessages.map((message, idx) => (
                          <div 
                            key={idx} 
                            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div 
                              className={`max-w-[90%] p-3 rounded-lg ${
                                message.role === "user" 
                                  ? "bg-primary text-primary-foreground" 
                                  : "bg-muted"
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          data-testid="input-chat"
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          placeholder="Ask AI to improve your content..."
                          onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                        />
                        <Button 
                          data-testid="button-send"
                          onClick={handleSendMessage}
                          disabled={!chatMessage.trim() || previewMutation.isPending}
                          size="icon"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {currentPreview && currentPreview.success && currentPreview.preview?.appliedPatches?.length > 0 && (
                        <Button 
                          data-testid="button-apply"
                          onClick={handleApplyChanges}
                          disabled={applyMutation.isPending}
                          className="w-full"
                          variant="default"
                        >
                          {applyMutation.isPending ? "Applying..." : "Apply Changes to Repository"}
                        </Button>
                      )}
                      
                      {currentPreview && !currentPreview.success && (
                        <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded">
                          <div className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                            Preview Error
                          </div>
                          <div className="text-xs text-red-600 dark:text-red-400">
                            {currentPreview.errors?.join(", ") || "Unknown error occurred"}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Diff Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Content Preview & Diff
                    </CardTitle>
                    <CardDescription>
                      Review changes before applying to repository
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {currentPreview ? (
                      <div className="space-y-4">
                        <div className="text-sm">
                          <span className="font-medium">Changes:</span> {currentPreview.preview.appliedPatches?.length || 0} fields modified
                        </div>
                        
                        <Tabs defaultValue="diff" className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="diff">Diff View</TabsTrigger>
                            <TabsTrigger value="patches">Applied Patches</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="diff" className="space-y-2">
                            <ScrollArea className="h-64 border rounded p-2">
                              <div className="space-y-1 text-sm font-mono">
                                {currentPreview.preview.fullDiff?.removed?.length === 0 && 
                                 currentPreview.preview.fullDiff?.added?.length === 0 ? (
                                  <div className="text-center py-4 text-muted-foreground">
                                    No line-level changes detected
                                  </div>
                                ) : (
                                  <>
                                    {currentPreview.preview.fullDiff?.removed?.map((line, idx) => (
                                      <div key={`removed-${idx}`} className="text-red-600 bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded">
                                        - {line}
                                      </div>
                                    ))}
                                    {currentPreview.preview.fullDiff?.added?.map((line, idx) => (
                                      <div key={`added-${idx}`} className="text-green-600 bg-green-50 dark:bg-green-950/20 px-2 py-1 rounded">
                                        + {line}
                                      </div>
                                    ))}
                                  </>
                                )}
                              </div>
                            </ScrollArea>
                          </TabsContent>
                          
                          <TabsContent value="patches" className="space-y-2">
                            <ScrollArea className="h-64 border rounded p-2">
                              <div className="space-y-2">
                                {currentPreview.preview.appliedPatches?.map((patch, idx) => (
                                  <div key={idx} className="p-2 bg-muted rounded text-sm">
                                    <div className="font-medium text-xs">{patch.path}</div>
                                    <div className="mt-1">{patch.value}</div>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </TabsContent>
                        </Tabs>
                        
                        {currentPreview.preview.spyfuInsights && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded">
                            <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                              SpyFu Competitor Insights Applied
                            </div>
                            <div className="text-xs text-blue-600 dark:text-blue-400">
                              Content optimized with competitor keyword analysis
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Eye className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-muted-foreground text-sm">
                          Use the AI assistant to generate content improvements
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">Select a Hugo file to edit</p>
                  <Button onClick={() => setActiveTab("create")}>
                    Connect Repository
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="publish" className="space-y-6">
            {selectedFile ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Hugo Content Preview
                    </CardTitle>
                    <CardDescription>
                      Review your Hugo content before applying changes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      <h1>{selectedFile.frontMatter?.title || selectedFile.name}</h1>
                      <div className="text-sm text-muted-foreground mb-4">
                        File: {selectedFile.path}
                      </div>
                      <div className="whitespace-pre-wrap text-sm">
                        {selectedFile.body || "No content available"}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Publish Settings
                    </CardTitle>
                    <CardDescription>
                      Configure publishing options
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Array.isArray(githubConnections) && githubConnections.length > 0 ? (
                      <>
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Content will be published to your connected GitHub repository
                          </AlertDescription>
                        </Alert>
                        
                        <Button 
                          onClick={() => {
                            toast({
                              title: "Hugo Content Management",
                              description: "Use the Editor tab to make changes and apply them to your repository.",
                            });
                            setActiveTab("editor");
                          }}
                          className="w-full"
                        >
                          Go to Content Editor
                        </Button>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <Github className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground mb-4">Connect a GitHub repository to publish</p>
                        <Button onClick={connectGitHub}>
                          Connect Repository
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">Select Hugo content to preview</p>
                  <Button onClick={() => setActiveTab("overview")}>
                    View Content Library
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}